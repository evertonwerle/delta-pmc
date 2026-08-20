require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../backend/database');

(async () => {
  await db.ready;

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
await db.exec(schema);

// Estruturas do Hall de Entrada dos pilotos aprovados.
await db.exec(`
CREATE TABLE IF NOT EXISTS apreensoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, ocorrencia TEXT NOT NULL, item TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1, observacoes TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pontos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, entrada TEXT NOT NULL DEFAULT (datetime('now')), saida TEXT,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS fardamentos (
  usuario_id INTEGER PRIMARY KEY, uniforme INTEGER NOT NULL DEFAULT 0, colete INTEGER NOT NULL DEFAULT 0, distintivo INTEGER NOT NULL DEFAULT 0, equipamento INTEGER NOT NULL DEFAULT 0, observacoes TEXT, atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);`);


// Histórico de candidaturas finalizadas. A candidatura ativa pode ser removida
// após reprovação/deleção sem perder o registro administrativo.
await db.exec(`
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
);`);



await db.exec(`
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
);`);

await db.exec(`CREATE TABLE IF NOT EXISTS vtrs (id INTEGER PRIMARY KEY AUTOINCREMENT,prefixo TEXT NOT NULL UNIQUE,modelo TEXT NOT NULL,placa TEXT,status TEXT NOT NULL DEFAULT 'DISPONIVEL',observacoes TEXT,criado_em TEXT NOT NULL DEFAULT (datetime('now')),atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));CREATE INDEX IF NOT EXISTS idx_vtrs_status ON vtrs(status);`);

async function hasColumn(table, column) {
  return (await db.all(`PRAGMA table_info(${table})`)).some(c => c.name === column);
}

const migrations = [
  [`candidaturas`, `idade_ic`, `ALTER TABLE candidaturas ADD COLUMN idade_ic TEXT`],
  [`candidaturas`, `disponibilidade`, `ALTER TABLE candidaturas ADD COLUMN disponibilidade TEXT`],
  [`candidaturas`, `usuario_id`, `ALTER TABLE candidaturas ADD COLUMN usuario_id INTEGER`],
  [`users`, `cargo_delta`, `ALTER TABLE users ADD COLUMN cargo_delta TEXT NOT NULL DEFAULT 'PILOTO PROBATORIO'`],
  [`users`, `inscricao_enviada`, `ALTER TABLE users ADD COLUMN inscricao_enviada INTEGER NOT NULL DEFAULT 0`],
  [`users`, `status_conta`, `ALTER TABLE users ADD COLUMN status_conta TEXT NOT NULL DEFAULT 'ATIVA'`],
  [`apreensoes`, `id_pessoa`, `ALTER TABLE apreensoes ADD COLUMN id_pessoa TEXT NOT NULL DEFAULT ''`],
  [`apreensoes`, `imagem_url`, `ALTER TABLE apreensoes ADD COLUMN imagem_url TEXT`]
];
for (const [table, column, sql] of migrations) {
  if (!(await hasColumn(table, column))) await db.exec(sql);
}

await db.run("UPDATE users SET status_conta = 'ATIVA' WHERE status_conta IS NULL OR TRIM(status_conta) = ''");
await db.run("UPDATE users SET cargo_delta = 'PILOTO PROBATORIO' WHERE cargo_delta IS NULL OR TRIM(cargo_delta) = ''");
await db.run("UPDATE users SET inscricao_enviada = 1 WHERE id IN (SELECT DISTINCT usuario_id FROM candidaturas WHERE usuario_id IS NOT NULL)");

await db.exec(`
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
`);

console.log('Banco SQLite criado/verificado com sucesso!');
console.log(`Arquivo: ${db.dbPath}`);

// Conteúdo inicial editável pelo comando. Só cria os padrões se ainda não existirem.
const defaults = [
  ['ETAPA','Etapa 1','Análise documental e avaliação inicial do candidato. O Comando Delta verifica os dados enviados, a patente atual e o histórico disciplinar do candidato dentro da corporação.\n\nDURAÇÃO: 1-3 DIAS\nRESPONSÁVEL: COMANDO DELTA',1],
  ['ETAPA','Etapa 2','Teste prático de pilotagem tática. Candidatos aprovados na Etapa 1 realizam um teste de pilotagem em circuito controlado, avaliando precisão, controle de velocidade e tomada de decisão em cenários de perseguição simulada.\n\nLOCAL: PISTA DELTA\nRESPONSÁVEL: INSTRUTOR DELTA',2],
  ['ETAPA','Etapa 3','Entrevista final com o comando. Etapa final do processo seletivo, com conversa direta entre o candidato e o Comando Delta sobre postura, comprometimento e disponibilidade para integrar a unidade.\n\nFORMATO: INDIVIDUAL\nRESPONSÁVEL: COMANDANTE DELTA',3],
  ['MANUAL','Abordagem Veicular','Toda abordagem deve ser precedida de posicionamento seguro da viatura, sinalização clara e comunicação prévia à central antes do contato com o condutor.',1],
  ['MANUAL','Protocolo de Perseguição','Durante uma perseguição, a equipe deve manter comunicação objetiva, preservar a segurança da população e seguir os procedimentos definidos pela Unidade Delta.',2],
  ['MANUAL','Escolta de Comboio','A escolta deve manter formação, distância segura e comunicação constante entre as viaturas. Alterações de rota devem ser informadas pelos canais internos.',3],
  ['MANUAL','Comunicação em Serviço','O uso do canal tático é reservado para ocorrências ativas. Comunicações administrativas devem ser feitas por canais internos da corporação.',4],
  ['APOSTILA','Como funciona o processo seletivo','Esta apostila reúne os materiais de estudo para candidatos inscritos na Unidade Delta. Estude os procedimentos, revise o conteúdo do Edital e acompanhe a liberação das etapas pelo Comando.',1],
  ['APOSTILA','Conduta e disciplina','Mantenha postura profissional, respeito à hierarquia, disciplina e comunicação adequada durante todo o processo seletivo.',2],
  ['APOSTILA','Pilotagem e segurança','Revise os fundamentos de pilotagem, controle do veículo, direção defensiva e tomada de decisão segura em situações de acompanhamento.',3],
  ['EDITAL','Introdução','Insígnia Oficial — Unidade DELTA, 1ºBPM Metroville.\n\nA Unidade DELTA é o grupamento especializado do 1ºBPM responsável por acompanhamentos táticos, perseguições de alta velocidade e escoltas de comboio.\n\nFormada por agentes selecionados por disciplina, técnica de pilotagem e conduta exemplar, a Delta atua como resposta rápida em ocorrências que exigem deslocamento veicular de precisão dentro do perímetro de Metroville.',1],
  ['EDITAL','Objetivo da Unidade','Garantir acompanhamentos veiculares seguros e eficientes, reduzindo riscos a civis e demais agentes durante perseguições e escoltas de alta prioridade.\n\nAtuar em conjunto com as demais unidades do 1ºBPM, prestando apoio tático especializado sempre que solicitado pelo comando geral.',2],
  ['EDITAL','Hierarquia','Comandante Delta — Responsável máximo pela unidade e suas diretrizes.\nSubcomandante — Auxilia o comando e responde na ausência deste.\nInstrutor Delta — Conduz treinamentos e avaliações de novos agentes.\nAgente Delta — Efetivo operacional em serviço regular.\nAspirante — Em período de avaliação após aprovação no edital.',3],
  ['EDITAL','Regras','Pontualidade — Presença obrigatória nos treinamentos agendados pelo comando.\nConduta — Respeito à hierarquia e ao regimento geral da PMC em qualquer circunstância.\nUso de viaturas — Veículos da unidade só podem ser utilizados em serviço ativo.\nComunicação — Uso correto dos canais de rádio durante operações.',4],
  ['EDITAL','Fardamento Oficial','O uso do fardamento Delta é obrigatório durante todo o período de serviço, incluindo colete identificado, distintivo da unidade e equipamento padrão do 1ºBPM.\n\nAlterações no fardamento oficial só podem ser autorizadas pelo Comando Delta.',5],
  ['EDITAL','Viaturas','Viatura P1-Delta — Unidade principal de patrulhamento e acompanhamento.\nViatura de Apoio — Utilizada em escoltas e reforço tático.\nViatura de Instrução — Reservada para treinamentos internos.',6],
  ['EDITAL','Rebaixamentos','Agentes que descumprirem o regimento da unidade estão sujeitos a rebaixamento de patente, aplicado após avaliação do Comando Delta em conjunto com a cúpula da PMC.',7],
  ['EDITAL','Punições','Advertência — Primeira ocorrência de conduta inadequada.\nSuspensão — Reincidência ou falta grave durante serviço.\nDesligamento — Casos graves ou reincidência após suspensão.',8],
  ['EDITAL','Modulação','Toda modulação de viaturas segue o padrão visual definido pelo Comando Delta, mantendo identidade visual única do grupamento dentro da frota da PMC.',9],
  ['EDITAL','Acompanhamento','Protocolos de acompanhamento tático seguem distância mínima de segurança, comunicação constante com a central e avaliação de risco contínua durante toda a ocorrência.',10]
];
for (const [categoria,titulo,conteudo,ordem] of defaults) {
  const existe = await db.get('SELECT id FROM documentos WHERE categoria = ? AND ordem = ? LIMIT 1', [categoria,ordem]);
  if (!existe) await db.run(`INSERT INTO documentos (categoria,titulo,conteudo,ordem,ativo,atualizado_em) VALUES (?,?,?,?,1,datetime('now'))`, [categoria,titulo,conteudo,ordem]);
}

})().catch(error => { console.error(error); process.exitCode = 1; });
