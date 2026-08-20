require('dotenv').config();

const fs = require('fs');
const path = require('path');
let createClient;

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const useTurso = Boolean(
  String(process.env.TURSO_DATABASE_URL || '').trim() &&
  String(process.env.TURSO_AUTH_TOKEN || '').trim()
);

function resolveLocalDbPath() {
  const configured = String(process.env.DELTA_DB_PATH || '').trim();
  if (configured) return path.isAbsolute(configured) ? configured : path.resolve(dataDir, configured);

  const candidates = [
    path.join(dataDir, 'delta.sqlite'),
    path.join(dataDir, 'delta3333.sqlite')
  ].filter(fs.existsSync);

  if (candidates.length === 0) return path.join(dataDir, 'delta.sqlite');
  if (candidates.length === 1) return candidates[0];

  // Mantém o comportamento anterior para desenvolvimento local: escolhe a
  // cópia com maior quantidade de dados relevantes.
  let best = candidates[0];
  let bestScore = -1;
  for (const candidate of candidates) {
    let score = 0;
    try {
      const { DatabaseSync } = require('node:sqlite');
      const probe = new DatabaseSync(candidate, { readOnly: true });
      const count = table => {
        try { return Number(probe.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get()?.total || 0); }
        catch (_) { return 0; }
      };
      score += count('users') * 100000;
      score += count('candidaturas') * 1000;
      score += count('admins') * 100;
      score += count('logs_sistema');
      try { probe.close(); } catch (_) {}
    } catch (_) {}
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

let localDb = null;
let client = null;

if (useTurso) {
  ({ createClient } = require('@libsql/client'));
  client = createClient({
    url: String(process.env.TURSO_DATABASE_URL).trim(),
    authToken: String(process.env.TURSO_AUTH_TOKEN).trim()
  });
} else {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = resolveLocalDbPath();
  localDb = new DatabaseSync(dbPath);
  localDb.exec('PRAGMA foreign_keys = ON;');
}

const dbPath = useTurso ? String(process.env.TURSO_DATABASE_URL).trim() : resolveLocalDbPath();

function normalizeResult(result) {
  return {
    changes: Number(result?.rowsAffected || result?.changes || 0),
    lastInsertRowid: result?.lastInsertRowid == null ? undefined : Number(result.lastInsertRowid)
  };
}

async function run(sql, params = []) {
  if (useTurso) return normalizeResult(await client.execute({ sql, args: params }));
  return normalizeResult(localDb.prepare(sql).run(...params));
}

async function get(sql, params = []) {
  if (useTurso) {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  }
  return localDb.prepare(sql).get(...params) || null;
}

async function all(sql, params = []) {
  if (useTurso) {
    const result = await client.execute({ sql, args: params });
    return result.rows || [];
  }
  return localDb.prepare(sql).all(...params);
}

async function exec(sql) {
  if (useTurso) {
    await client.executeMultiple(sql);
    return;
  }
  return localDb.exec(sql);
}

async function initialize() {
  const schemaPath = path.join(rootDir, 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await exec(schema);

  await exec(`CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expire INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);`);

  // Migrações incrementais para bancos criados por versões anteriores.
  const migrations = [
    ['candidaturas', 'idade_ic', 'ALTER TABLE candidaturas ADD COLUMN idade_ic TEXT'],
    ['candidaturas', 'disponibilidade', 'ALTER TABLE candidaturas ADD COLUMN disponibilidade TEXT'],
    ['candidaturas', 'usuario_id', 'ALTER TABLE candidaturas ADD COLUMN usuario_id INTEGER'],
    ['users', 'cargo_delta', "ALTER TABLE users ADD COLUMN cargo_delta TEXT NOT NULL DEFAULT 'PILOTO PROBATORIO'"],
    ['users', 'inscricao_enviada', 'ALTER TABLE users ADD COLUMN inscricao_enviada INTEGER NOT NULL DEFAULT 0'],
    ['users', 'status_conta', "ALTER TABLE users ADD COLUMN status_conta TEXT NOT NULL DEFAULT 'ATIVA'"],
    ['apreensoes', 'id_pessoa', "ALTER TABLE apreensoes ADD COLUMN id_pessoa TEXT NOT NULL DEFAULT ''"],
    ['apreensoes', 'imagem_url', 'ALTER TABLE apreensoes ADD COLUMN imagem_url TEXT'],
    ['exoneracoes', 'observacoes', 'ALTER TABLE exoneracoes ADD COLUMN observacoes TEXT']
  ];

  for (const [table, column, sql] of migrations) {
    const cols = await all(`PRAGMA table_info(${table})`);
    if (!cols.some(c => String(c.name) === column)) {
      try { await exec(sql); } catch (error) {
        // Em deploys concorrentes outra instância pode ter aplicado a mesma
        // migração entre o PRAGMA e o ALTER TABLE.
        if (!/duplicate column/i.test(String(error.message || ''))) throw error;
      }
    }
  }

  await run("UPDATE users SET status_conta = 'ATIVA' WHERE status_conta IS NULL OR TRIM(status_conta) = ''");
  await run("UPDATE users SET cargo_delta = 'PILOTO PROBATORIO' WHERE cargo_delta IS NULL OR TRIM(cargo_delta) = ''");
  await run("UPDATE users SET inscricao_enviada = 1 WHERE id IN (SELECT DISTINCT usuario_id FROM candidaturas WHERE usuario_id IS NOT NULL)");

  // Índices adicionados pelas versões mais recentes.
  await exec(`
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs_sistema(criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_relatorios_usuario ON relatorios_acoes(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios_acoes(data_acao);
    CREATE INDEX IF NOT EXISTS idx_historico_cargos_usuario ON historico_cargos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_delta_mensagens_canal ON delta_mensagens(canal, id DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
  `);

  console.log(`[DELTA] Banco ativo: ${dbPath}${useTurso ? ' (Turso)' : ' (SQLite local)'}`);
}

// Todas as rotas aguardam esta promessa antes de consultar o banco.
const ready = initialize();

module.exports = {
  run,
  get,
  all,
  exec,
  dbPath,
  isTurso: useTurso,
  ready,
  client
};
