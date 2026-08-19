const express = require('express');
const db = require('../database');
const hierarchyAuth = require('../middleware/hierarchy');

const router = express.Router();

const CARGOS = [
  'GESTOR',
  'SUB-GESTOR',
  'COORDENADOR',
  'PILOTO MASTER',
  'PILOTO DE ELITE',
  'PILOTO ESPECIALISTA',
  'PILOTO AVANÇADO',
  'PILOTO ASPIRANTE',
  'PILOTO PROBATORIO',
  'CANDIDATO'
];

router.get('/permissoes', async (req, res) => {
  const admin = !!req.session?.admin;
  const autorizado = admin || await hierarchyAuth.isHierarchyManager(req);
  // Sempre derive o cargo atual do SQLite. Isso evita que uma sessão antiga
  // mantenha permissões desatualizadas depois de uma promoção/rebaixamento.
  const cargo = admin
    ? String(req.session.admin?.cargo || 'ADMINISTRADOR').trim().toUpperCase()
    : await hierarchyAuth.cargoAtual(req);
  res.json({
    autorizado,
    admin,
    cargo,
    cargosControle: hierarchyAuth.TOP_CARGOS
  });
});

router.get('/', hierarchyAuth, async (req, res) => {
  const rows = await db.all(`
    SELECT u.id, u.username, u.nome, u.cargo_delta, u.ativo, u.status_conta, u.criado_em, u.ultimo_login,
           COALESCE((SELECT c.status FROM candidaturas c WHERE c.usuario_id = u.id ORDER BY c.id DESC LIMIT 1), '') AS candidatura_status
    FROM users u
    ORDER BY
      CASE cargo_delta
        WHEN 'GESTOR' THEN 1
        WHEN 'SUB-GESTOR' THEN 2
        WHEN 'COORDENADOR' THEN 3
        WHEN 'PILOTO MASTER' THEN 4
        WHEN 'PILOTO DE ELITE' THEN 5
        WHEN 'PILOTO ESPECIALISTA' THEN 6
        WHEN 'PILOTO AVANÇADO' THEN 7
        WHEN 'PILOTO ASPIRANTE' THEN 8
        WHEN 'PILOTO PROBATORIO' THEN 9
        WHEN 'CANDIDATO' THEN 10
        ELSE 11
      END,
      nome COLLATE NOCASE
  `);
  res.json({ cargos: CARGOS, usuarios: rows });
});

async function salvarCargoUsuario(req, res) {
  const id = Number(req.params.id);
  const { cargo, ativo, justificativa } = req.body || {};

  try {
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ sucesso: false, erro: 'ID de usuário inválido.' });
    }

    const cargoNovo = String(cargo || '').trim().toUpperCase();
    if (!CARGOS.includes(cargoNovo)) {
      return res.status(400).json({ sucesso: false, erro: `Cargo inválido: ${cargoNovo || '(vazio)'}.` });
    }

    const user = await db.get(
      'SELECT id, username, nome, cargo_delta, ativo, status_conta FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!user) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });

    // Impede autoelevação por uma conta comum. O Administrador do sistema
    // continua podendo definir qualquer cargo, inclusive para a própria conta.
    if (!req.session.admin && Number(req.session.user?.id) === id) {
      return res.status(403).json({
        sucesso: false,
        erro: 'Uma conta de usuário não pode alterar o próprio cargo. Faça a alteração usando uma conta ADMINISTRADOR autorizada.'
      });
    }

    const cargoAnterior = String(user.cargo_delta || '').trim().toUpperCase();
    const novoAtivo = ['GESTOR', 'SUB-GESTOR', 'COORDENADOR'].includes(cargoNovo)
      ? 1
      : (ativo === undefined ? Number(user.ativo) : (ativo ? 1 : 0));
    const novoStatus = novoAtivo ? 'ATIVA' : (user.status_conta || 'INATIVA');
    const justificativaTexto = String(justificativa || '').trim();
    const actor = req.session.admin
      ? { tipo: 'ADMINISTRADOR', id: Number(req.session.admin.id) || null, nome: req.session.admin.nome || req.session.admin.username || 'Administrador' }
      : { tipo: String(req.session.user?.cargo || 'COMANDO').trim().toUpperCase(), id: Number(req.session.user?.id) || null, nome: req.session.user?.nome || req.session.user?.username || 'Comando' };

    // Turso/LibSQL usa uma API assíncrona e pode atender requisições por conexões
    // diferentes. Por isso não simulamos BEGIN/COMMIT com chamadas separadas:
    // o UPDATE principal é confirmado diretamente e a auditoria é secundária.
    const update = await db.run(
      'UPDATE users SET cargo_delta = ?, ativo = ?, status_conta = ? WHERE id = ?',
      [cargoNovo, novoAtivo, novoStatus, id]
    );

    if (!update || Number(update.changes || 0) !== 1) {
      throw new Error('O banco de dados não confirmou a atualização do usuário.');
    }

    const confirmado = await db.get(
      'SELECT id, username, nome, cargo_delta, ativo, status_conta FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!confirmado || String(confirmado.cargo_delta || '').trim().toUpperCase() !== cargoNovo) {
      throw new Error('O banco de dados não retornou o cargo solicitado após o UPDATE.');
    }

    // Auditoria não impede a persistência do cargo.
    try {
      if (cargoAnterior !== cargoNovo) {
        await db.run(
          `INSERT INTO historico_cargos
            (usuario_id,cargo_anterior,cargo_novo,justificativa,responsavel_tipo,responsavel_id)
           VALUES (?,?,?,?,?,?)`,
          [id, user.cargo_delta || null, cargoNovo, justificativaTexto, actor.tipo, actor.id]
        );

        await db.run(
          `INSERT INTO logs_sistema
            (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes)
           VALUES (?,?,?,?,?,?,?)`,
          [actor.tipo, actor.id, actor.nome, 'ALTERAÇÃO DE CARGO', 'USUARIO', id,
            `${user.cargo_delta || 'SEM CARGO'} → ${cargoNovo}${justificativaTexto ? `. ${justificativaTexto}` : ''}`]
        );
      }
      if (Number(user.ativo) !== Number(novoAtivo)) {
        await db.run(
          `INSERT INTO logs_sistema
            (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes)
           VALUES (?,?,?,?,?,?,?)`,
          [actor.tipo, actor.id, actor.nome, 'ALTERAÇÃO DE STATUS', 'USUARIO', id, `Status: ${novoAtivo ? 'ATIVO' : 'INATIVO'}`]
        );
      }
    } catch (auditError) {
      console.error('[HIERARQUIA] Falha apenas na auditoria; cargo foi mantido:', auditError);
    }

    const atualizado = await db.get(
      'SELECT id, username, nome, cargo_delta, ativo, status_conta FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!atualizado || String(atualizado.cargo_delta || '').trim().toUpperCase() !== cargoNovo) {
      return res.status(500).json({ sucesso: false, erro: 'A alteração não pôde ser confirmada após a gravação.' });
    }

    return res.json({
      sucesso: true,
      persistido: true,
      confirmado: true,
      mensagem: `Cargo atualizado para ${cargoNovo}.`,
      usuario: atualizado
    });
  } catch (error) {
    console.error('[HIERARQUIA] Erro definitivo ao salvar cargo:', error);
    return res.status(500).json({ sucesso: false, erro: `Não foi possível atualizar o cargo: ${error.message}` });
  }
}

// Endpoint principal e aliases para tornar a operação resiliente a versões
// antigas do frontend/cache.
router.patch('/usuarios/:id', hierarchyAuth, salvarCargoUsuario);
router.put('/usuarios/:id/cargo', hierarchyAuth, salvarCargoUsuario);
router.post('/usuarios/:id/cargo', hierarchyAuth, salvarCargoUsuario);

router.get('/usuarios/:id/cargo', hierarchyAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = await db.get(
      'SELECT id, username, nome, cargo_delta, ativo, status_conta FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!usuario) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
    res.json({ sucesso: true, persistido: true, usuario });
  } catch (error) {
    console.error('[HIERARQUIA] Erro ao verificar cargo:', error);
    res.status(500).json({ sucesso: false, erro: 'Não foi possível verificar o cargo.' });
  }
});

async function canManageApprovedPilot(req) {
  if (req.session?.admin) return true;
  const cargo = await hierarchyAuth.cargoAtual(req);
  return ['GESTOR', 'SUB-GESTOR'].includes(cargo);
}

router.patch('/usuarios/:id/exonerar', async (req, res) => {
  try {
    if (!await canManageApprovedPilot(req)) {
      return res.status(403).json({ erro: 'Somente ADMINISTRADOR, GESTOR e SUB-GESTOR podem exonerar pilotos aprovados.' });
    }
    const id = Number(req.params.id);
    const nivel = String(req.body?.nivel || '').trim().toUpperCase();
    const motivo = String(req.body?.motivo || '').trim();
    const niveis = ['ABANDONO_DE_POSTO','INSUBORDINACAO','CONDUTA_INADEQUADA','BAIXA_ATIVIDADE','OUTROS'];
    if (!niveis.includes(nivel)) return res.status(400).json({ erro: 'Selecione um nível de exoneração válido.' });
    if (motivo.length < 3) return res.status(400).json({ erro: 'Informe o motivo/detalhamento da exoneração.' });

    const user = await db.get(`
      SELECT u.id, u.nome, u.username, u.cargo_delta, u.ativo,
             (SELECT c.status FROM candidaturas c WHERE c.usuario_id = u.id ORDER BY c.id DESC LIMIT 1) AS candidatura_status
      FROM users u WHERE u.id = ? LIMIT 1
    `, [id]);
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    const cargoUsuario = String(user.cargo_delta || '').toUpperCase();
    const cargosPiloto = ['PILOTO PROBATORIO','PILOTO ASPIRANTE','PILOTO AVANÇADO','PILOTO ESPECIALISTA','PILOTO DE ELITE','PILOTO MASTER'];
    if (!cargosPiloto.includes(cargoUsuario) && String(user.candidatura_status || '').toUpperCase() !== 'APROVADO') {
      return res.status(400).json({ erro: 'Somente candidatos aprovados ou pilotos podem ser exonerados.' });
    }
    if (['GESTOR','SUB-GESTOR','COORDENADOR'].includes(String(user.cargo_delta || '').toUpperCase())) {
      return res.status(400).json({ erro: 'Contas de comando não podem ser exoneradas por esta função.' });
    }

    await db.run(`
      INSERT INTO exoneracoes
      (usuario_id, nome, username, cargo_no_momento, nivel, motivo, responsavel_tipo, responsavel_id, ocorrido_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      user.id, user.nome, user.username, user.cargo_delta || 'PILOTO',
      nivel, motivo,
      req.session.admin ? 'ADMIN' : String(req.session.user?.cargo || 'GESTOR').toUpperCase(),
      req.session.admin?.id ?? req.session.user?.id ?? null
    ]);

    // Fecha a candidatura aprovada atual sem apagar o histórico. Assim, o
    // exonerado poderá iniciar um novo edital no futuro.
    const candidaturaAtual = await db.get(
      `SELECT * FROM candidaturas WHERE usuario_id = ? AND status = 'APROVADO' ORDER BY id DESC LIMIT 1`,
      [id]
    );
    if (candidaturaAtual) {
      await db.run(`
        INSERT INTO candidaturas_historico
        (candidatura_id, usuario_id, personagem, id_jogador, patente, tempo_pmc, idade_ic, disponibilidade, experiencia, motivo, etapa, etapa_liberada, status, observacao, responsavel_id, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EXONERADO', ?, ?, ?)
      `, [
        candidaturaAtual.id, candidaturaAtual.usuario_id, candidaturaAtual.personagem, candidaturaAtual.id_jogador,
        candidaturaAtual.patente || null, candidaturaAtual.tempo_pmc || null, candidaturaAtual.idade_ic || null,
        candidaturaAtual.disponibilidade || null, candidaturaAtual.experiencia || null, candidaturaAtual.motivo || null,
        candidaturaAtual.etapa || 3, candidaturaAtual.etapa_liberada || 3,
        `Exonerado — ${nivel}: ${motivo}`, req.session.admin?.id ?? null, candidaturaAtual.criado_em || null
      ]);
      await db.run('DELETE FROM candidaturas WHERE id = ?', [candidaturaAtual.id]);
    }

    await db.run(`UPDATE users SET ativo = 0, status_conta = 'EXONERADO', inscricao_enviada = 0 WHERE id = ?`, [id]);
    res.json({
      sucesso: true,
      mensagem: `${user.nome} foi exonerado. A conta permanece registrada e poderá retornar ao processo seletivo no futuro.`,
      nivel,
      motivo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível exonerar o piloto.' });
  }
});


router.patch('/usuarios/:id/banir', async (req,res)=>{
  try{
    if(!await canManageApprovedPilot(req)) return res.status(403).json({erro:'Somente ADMINISTRADOR, GESTOR e SUB-GESTOR podem banir permanentemente.'});
    const id=Number(req.params.id), motivo=String(req.body?.motivo||'').trim();
    if(motivo.length<3) return res.status(400).json({erro:'Informe o motivo do banimento.'});
    const u=await db.get(`SELECT id,nome,username,cargo_delta FROM users WHERE id=?`,[id]); if(!u)return res.status(404).json({erro:'Usuário não encontrado.'});
    await db.run(`INSERT INTO exoneracoes (usuario_id,nome,username,cargo_no_momento,nivel,motivo,responsavel_tipo,responsavel_id) VALUES (?,?,?,?,?,?,?,?)`,[u.id,u.nome,u.username,u.cargo_delta||'PILOTO','BANIMENTO_PERMANENTE',motivo,req.session.admin?'ADMIN':String(req.session.user?.cargo||'GESTOR').toUpperCase(),req.session.admin?.id??req.session.user?.id??null]);
    await db.run(`UPDATE users SET ativo=0,status_conta='BANIDO',inscricao_enviada=0 WHERE id=?`,[id]);
    const r=req.session.admin?{tipo:'ADMINISTRADOR',id:req.session.admin.id,nome:req.session.admin.nome}: {tipo:String(req.session.user?.cargo||'GESTOR').toUpperCase(),id:req.session.user?.id,nome:req.session.user?.nome};
    await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,[r.tipo,r.id,r.nome,'BANIMENTO PERMANENTE','USUARIO',id,motivo]);
    res.json({sucesso:true,mensagem:`${u.nome} foi banido permanentemente.`});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível banir o usuário.'});}
});

router.get('/desligamentos', async (req, res) => {
  try {
    if (!req.session?.admin && !req.session?.user?.id) {
      return res.status(401).json({ erro: 'Faça login para consultar os desligamentos.' });
    }
    const rows = await db.all(`
      SELECT e.id, e.usuario_id, e.nome, e.username, e.cargo_no_momento,
             e.nivel, e.motivo, e.responsavel_tipo, e.responsavel_id, e.ocorrido_em
      FROM exoneracoes e
      ORDER BY e.ocorrido_em DESC, e.id DESC
    `);
    res.json({ desligamentos: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível carregar os desligamentos.' });
  }
});

router.get('/usuarios/:id/exoneracoes', async (req, res) => {
  try {
    if (!await canManageApprovedPilot(req)) return res.status(403).json({ erro: 'Sem permissão.' });
    const rows = await db.all(`
      SELECT id, nome, username, cargo_no_momento, nivel, motivo, responsavel_tipo, ocorrido_em
      FROM exoneracoes WHERE usuario_id = ? ORDER BY id DESC
    `, [Number(req.params.id)]);
    const retornos = await db.all(`
      SELECT id, exoneracao_id, candidatura_id, iniciado_em, status
      FROM retornos_atividade WHERE usuario_id = ? ORDER BY id DESC
    `, [Number(req.params.id)]);
    res.json({ exoneracoes: rows, retornos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível carregar o histórico.' });
  }
});

router.delete('/usuarios/:id', async (req, res) => {
  try {
    if (!await canManageApprovedPilot(req)) {
      return res.status(403).json({ erro: 'Somente ADMINISTRADOR, GESTOR e SUB-GESTOR podem deletar pilotos aprovados.' });
    }
    const id = Number(req.params.id);
    const user = await db.get(`
      SELECT u.id, u.nome, u.cargo_delta,
             (SELECT c.status FROM candidaturas c WHERE c.usuario_id = u.id ORDER BY c.id DESC LIMIT 1) AS candidatura_status
      FROM users u WHERE u.id = ? LIMIT 1
    `, [id]);
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    const statusCandidatura = String(user.candidatura_status || '').toUpperCase();
    const cargo = String(user.cargo_delta || '').toUpperCase();
    const podeDeletar = statusCandidatura === 'APROVADO' || ['EXONERADO','PILOTO PROBATÓRIO','PILOTO PROBATORIO'].includes(cargo);
    if (!podeDeletar) {
      return res.status(400).json({ erro: 'Somente pilotos aprovados ou exonerados podem ser deletados por esta função.' });
    }
    if (['GESTOR','SUB-GESTOR','COORDENADOR'].includes(String(user.cargo_delta || '').toUpperCase())) {
      return res.status(400).json({ erro: 'Contas de comando não podem ser deletadas por esta função.' });
    }
    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
    if (Number(result?.changes || 0) !== 1) return res.status(409).json({ erro: 'A conta não pôde ser removida do banco de dados.' });
    res.json({ sucesso: true, mensagem: `${user.nome} foi removido permanentemente.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível deletar o piloto.' });
  }
});

module.exports = router;
