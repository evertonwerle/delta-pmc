PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nome TEXT,
  cargo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_login TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  cargo_delta TEXT NOT NULL DEFAULT 'PILOTO PROBATORIO',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_login TEXT,
  inscricao_enviada INTEGER NOT NULL DEFAULT 0,
  status_conta TEXT NOT NULL DEFAULT 'ATIVA'
);

CREATE TABLE IF NOT EXISTS candidaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  personagem TEXT NOT NULL,
  id_jogador TEXT NOT NULL,
  patente TEXT,
  tempo_pmc TEXT,
  idade_ic TEXT,
  disponibilidade TEXT,
  experiencia TEXT,
  motivo TEXT,
  etapa INTEGER NOT NULL DEFAULT 0,
  etapa_liberada INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE','APROVADO','REPROVADO')),
  observacao TEXT,
  responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS candidaturas_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidatura_id INTEGER,
  usuario_id INTEGER,
  personagem TEXT NOT NULL,
  id_jogador TEXT NOT NULL,
  patente TEXT,
  tempo_pmc TEXT,
  idade_ic TEXT,
  disponibilidade TEXT,
  experiencia TEXT,
  motivo TEXT,
  etapa INTEGER NOT NULL DEFAULT 0,
  etapa_liberada INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  observacao TEXT,
  responsavel_id INTEGER,
  criado_em TEXT,
  finalizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS membros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personagem TEXT NOT NULL,
  id_jogador TEXT NOT NULL,
  patente TEXT,
  cargo_delta TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK(status IN ('ATIVO','AFASTADO','DESLIGADO')),
  data_entrada TEXT,
  data_saida TEXT,
  observacoes TEXT
);

CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS apreensoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ocorrencia TEXT NOT NULL,
  id_pessoa TEXT NOT NULL DEFAULT '',
  item TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  imagem_url TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pontos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  entrada TEXT NOT NULL DEFAULT (datetime('now')),
  saida TEXT,
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
CREATE INDEX IF NOT EXISTS idx_fardamento_itens_categoria ON fardamento_itens(categoria, ordem, id);

CREATE TABLE IF NOT EXISTS fardamentos (
  usuario_id INTEGER PRIMARY KEY,
  uniforme INTEGER NOT NULL DEFAULT 0,
  colete INTEGER NOT NULL DEFAULT 0,
  distintivo INTEGER NOT NULL DEFAULT 0,
  equipamento INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exoneracoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  nome TEXT NOT NULL,
  username TEXT,
  cargo_no_momento TEXT,
  nivel TEXT NOT NULL DEFAULT 'OUTROS',
  motivo TEXT NOT NULL,
  responsavel_tipo TEXT NOT NULL,
  responsavel_id INTEGER,
  ocorrido_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS retornos_atividade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  exoneracao_id INTEGER,
  candidatura_id INTEGER,
  iniciado_em TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'NOVA_INSCRICAO',
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (exoneracao_id) REFERENCES exoneracoes(id) ON DELETE SET NULL,
  FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS historico_cargos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, cargo_anterior TEXT, cargo_novo TEXT NOT NULL, justificativa TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER, criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS logs_sistema (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_tipo TEXT, usuario_id INTEGER, usuario_nome TEXT, acao TEXT NOT NULL, entidade TEXT, entidade_id INTEGER, detalhes TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS vtrs (id INTEGER PRIMARY KEY AUTOINCREMENT,prefixo TEXT NOT NULL UNIQUE,modelo TEXT NOT NULL,placa TEXT,status TEXT NOT NULL DEFAULT 'DISPONIVEL',observacoes TEXT,criado_em TEXT NOT NULL DEFAULT (datetime('now')),atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));CREATE INDEX IF NOT EXISTS idx_vtrs_status ON vtrs(status);
CREATE TABLE IF NOT EXISTS relatorios_acoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, nome_acao TEXT NOT NULL, data_acao TEXT NOT NULL, veiculo1 TEXT, veiculo2 TEXT, daec TEXT NOT NULL, resultado TEXT NOT NULL, bo TEXT NOT NULL, quantidade_refens INTEGER NOT NULL DEFAULT 0, qra_negociador TEXT NOT NULL, observacoes TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS relatorios_acoes_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT, relatorio_id INTEGER NOT NULL, usuario_tipo TEXT, usuario_id INTEGER, acao TEXT NOT NULL, dados TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs_sistema(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_usuario ON relatorios_acoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios_acoes(data_acao);


CREATE TABLE IF NOT EXISTS portal_conteudos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, titulo TEXT NOT NULL, conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1, criado_por INTEGER, atualizado_por INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sugestoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, texto TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NOVA', resposta TEXT, responsavel_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS advertencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, nivel TEXT NOT NULL DEFAULT 'LEVE', motivo TEXT NOT NULL, observacoes TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER, criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ausencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, inicio TEXT NOT NULL, fim TEXT, motivo TEXT NOT NULL, observacoes TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER, status TEXT NOT NULL DEFAULT 'PROGRAMADA', atualizado_em TEXT NOT NULL DEFAULT (datetime('now')), criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, nome TEXT NOT NULL, descricao TEXT, imagem_url TEXT, responsavel_tipo TEXT NOT NULL, responsavel_id INTEGER, criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS delta_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT, canal TEXT NOT NULL, usuario_id INTEGER NOT NULL, mensagem TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
