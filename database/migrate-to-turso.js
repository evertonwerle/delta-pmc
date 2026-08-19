require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '..');
const configured = String(process.env.DELTA_DB_PATH || '').trim();
const localPath = configured
  ? (path.isAbsolute(configured) ? configured : path.join(root, 'data', configured))
  : path.join(root, 'data', 'delta.sqlite');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
}
if (!fs.existsSync(localPath)) throw new Error('SQLite não encontrado: ' + localPath);

const local = new DatabaseSync(localPath, { readOnly: true });
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function main() {
  // Desativa temporariamente as FKs durante a cópia para permitir a ordem
  // original das tabelas do SQLite. O schema continua com as FKs definidas.
  try { await client.execute('PRAGMA foreign_keys = OFF'); } catch (_) {}

  const tables = local.prepare(
    "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();

  for (const table of tables) {
    if (table.sql) await client.execute(table.sql);
  }

  for (const table of tables) {
    const name = quoteIdentifier(table.name);
    const cols = local.prepare(`PRAGMA table_info(${name})`).all();
    const rows = local.prepare(`SELECT * FROM ${name}`).all();
    if (!rows.length) continue;

    const names = cols.map(c => quoteIdentifier(c.name)).join(',');
    const marks = cols.map(() => '?').join(',');
    const sql = `INSERT INTO ${name} (${names}) VALUES (${marks})`;

    // LibSQL aceita batch de statements na mesma chamada, reduzindo muito
    // o tempo de migração para bancos com muitos logs.
    const batch = rows.map(row => ({
      sql,
      args: cols.map(c => row[c.name] == null ? null : row[c.name])
    }));
    for (let i = 0; i < batch.length; i += 500) {
      await client.batch(batch.slice(i, i + 500), 'write');
    }
    console.log(`Migrada ${table.name}: ${rows.length} registro(s)`);
  }

  try { await client.execute('PRAGMA foreign_keys = ON'); } catch (_) {}
  console.log('Migração concluída:', localPath, '->', process.env.TURSO_DATABASE_URL);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  try { local.close(); } catch (_) {}
});
