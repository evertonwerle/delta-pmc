const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

// O projeto passou por versões em que o banco ativo foi salvo com nomes
// diferentes (por exemplo, delta.sqlite e delta3333.sqlite).
// Se o backend abrir um arquivo diferente daquele que contém os usuários
// reais, alterações de cargo parecem funcionar na interface, mas nunca
// chegam ao banco que o administrador está consultando.
//
// Prioridade:
// 1) DELTA_DB_PATH, quando definido explicitamente;
// 2) banco existente com maior quantidade de dados de aplicação;
// 3) delta.sqlite como padrão para instalações novas.
function resolveDbPath() {
  const configured = String(process.env.DELTA_DB_PATH || '').trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(dataDir, configured);
  }

  const candidates = [
    path.join(dataDir, 'delta.sqlite'),
    path.join(dataDir, 'delta3333.sqlite')
  ].filter(fs.existsSync);

  if (candidates.length === 0) return path.join(dataDir, 'delta.sqlite');
  if (candidates.length === 1) return candidates[0];

  // Escolhe o banco que efetivamente contém mais dados do sistema.
  // Isso resolve cópias antigas do projeto sem apagar ou mesclar dados.
  let melhor = candidates[0];
  let melhorScore = -1;
  for (const candidate of candidates) {
    let score = 0;
    try {
      const probe = new DatabaseSync(candidate, { readOnly: true });
      const count = (table) => {
        try { return Number(probe.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get()?.total || 0); }
        catch (_) { return 0; }
      };
      // Usuários/candidaturas têm peso maior porque representam o estado
      // principal do ambiente de teste. Logs e conteúdo ajudam a desempatar.
      score += count('users') * 100000;
      score += count('candidaturas') * 1000;
      score += count('admins') * 100;
      score += count('logs_sistema');
      try { probe.close(); } catch (_) {}
    } catch (_) {
      score = 0;
    }
    if (score > melhorScore) {
      melhor = candidate;
      melhorScore = score;
    }
  }
  return melhor;
}

const dbPath = resolveDbPath();
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');

// Migrações incrementais: não apagam nem recriam o banco existente.
db.exec(`
CREATE TABLE IF NOT EXISTS historico_cargos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  cargo_anterior TEXT,
  cargo_novo TEXT NOT NULL,
  justificativa TEXT,
  responsavel_tipo TEXT NOT NULL,
  responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS logs_sistema (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_tipo TEXT,
  usuario_id INTEGER,
  usuario_nome TEXT,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id INTEGER,
  detalhes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS relatorios_acoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nome_acao TEXT NOT NULL,
  data_acao TEXT NOT NULL,
  veiculo1 TEXT,
  veiculo2 TEXT,
  daec TEXT NOT NULL,
  resultado TEXT NOT NULL,
  bo TEXT NOT NULL,
  quantidade_refens INTEGER NOT NULL DEFAULT 0,
  qra_negociador TEXT NOT NULL,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS fardamento_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  imagem_url TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS relatorios_acoes_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  relatorio_id INTEGER NOT NULL,
  usuario_tipo TEXT,
  usuario_id INTEGER,
  acao TEXT NOT NULL,
  dados TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs_sistema(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_usuario ON relatorios_acoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios_acoes(data_acao);
CREATE INDEX IF NOT EXISTS idx_historico_cargos_usuario ON historico_cargos(usuario_id);

CREATE TABLE IF NOT EXISTS portal_conteudos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, titulo TEXT NOT NULL, conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1, criado_por INTEGER, atualizado_por INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_portal_conteudos_chave ON portal_conteudos(chave,ordem,id);
CREATE TABLE IF NOT EXISTS sugestoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, texto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOVA', resposta TEXT, responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS delta_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canal TEXT NOT NULL,
  usuario_id INTEGER NOT NULL,
  mensagem TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_delta_mensagens_canal ON delta_mensagens(canal, id DESC);
CREATE TABLE IF NOT EXISTS advertencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, nivel TEXT NOT NULL DEFAULT 'LEVE',
  motivo TEXT NOT NULL, observacoes TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ausencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, inicio TEXT NOT NULL, fim TEXT,
  motivo TEXT NOT NULL, observacoes TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER,
  status TEXT NOT NULL DEFAULT 'PROGRAMADA', atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, nome TEXT NOT NULL, descricao TEXT, imagem_url TEXT,
  responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER, criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS vtrs (id INTEGER PRIMARY KEY AUTOINCREMENT,prefixo TEXT NOT NULL UNIQUE,modelo TEXT NOT NULL,placa TEXT,status TEXT NOT NULL DEFAULT 'DISPONIVEL',observacoes TEXT,criado_em TEXT NOT NULL DEFAULT (datetime('now')),atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));CREATE INDEX IF NOT EXISTS idx_vtrs_status ON vtrs(status);
CREATE TABLE IF NOT EXISTS avaliacoes_pilotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nota INTEGER NOT NULL CHECK(nota BETWEEN 1 AND 10),
  observacao TEXT,
  responsavel_tipo TEXT NOT NULL,
  responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ocorrencias_pilotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'LEVE' CHECK(nivel IN ('LEVE','MEDIA','GRAVE')),
  motivo TEXT NOT NULL,
  observacao TEXT,
  responsavel_tipo TEXT NOT NULL,
  responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
`);


function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params) || null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function exec(sql) {
  return db.exec(sql);
}

module.exports = { db, run, get, all, exec, dbPath };
