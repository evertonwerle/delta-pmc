const express = require('express');
const db = require('../database');
const adminAuth = require('../middleware/auth');
const login = require('../middleware/login');

const router = express.Router();

router.post('/', login.requireUser, async (req, res) => {
  try {
    const { personagem, id_jogador, patente, idade_ic, disponibilidade, experiencia, motivo } = req.body || {};
    if (!personagem || !id_jogador) return res.status(400).json({ erro: 'Personagem e ID são obrigatórios.' });

    const usuario = await db.get('SELECT id, inscricao_enviada, ativo, status_conta FROM users WHERE id = ? LIMIT 1', [req.session.user.id]);
    if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado.' });
    const statusConta = String(usuario.status_conta || '').toUpperCase();
    if (statusConta === 'BANIDO') return res.status(403).json({ erro: 'Esta conta foi banida permanentemente e não pode retornar ao processo seletivo.' });

    const existente = await db.get(
      `SELECT id FROM candidaturas
       WHERE usuario_id = ? AND COALESCE(UPPER(status),'PENDENTE') IN ('PENDENTE','APROVADO')
       ORDER BY id DESC LIMIT 1`,
      [req.session.user.id]
    );
    if (existente) return res.status(409).json({ erro: 'Sua conta já possui uma candidatura ativa.' });

    await db.run(
      `INSERT INTO candidaturas
       (usuario_id, personagem, id_jogador, patente, idade_ic, disponibilidade, experiencia, motivo, etapa, etapa_liberada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [req.session.user.id, personagem, id_jogador, patente || null, idade_ic || null, disponibilidade || null, experiencia || null, motivo || null]
    );
    const novoId = Number(await db.get('SELECT last_insert_rowid() AS id').id);
    // Se a pessoa estava exonerada, registra formalmente o retorno ao processo seletivo.
    const exoneracaoAnterior = await db.get(
      `SELECT id FROM exoneracoes WHERE usuario_id = ? ORDER BY id DESC LIMIT 1`,
      [req.session.user.id]
    );
    if (exoneracaoAnterior) {
      await db.run(
        `INSERT INTO retornos_atividade (usuario_id, exoneracao_id, candidatura_id, status)
         VALUES (?, ?, ?, 'NOVA_INSCRICAO')`,
        [req.session.user.id, exoneracaoAnterior.id, novoId]
      );
    }
    await db.run(`UPDATE users SET inscricao_enviada = 1, ativo = 1, status_conta = 'ATIVA' WHERE id = ?`, [req.session.user.id]);
    res.status(201).json({ sucesso: true, mensagem: exoneracaoAnterior ? 'Nova candidatura enviada. O retorno à ativa foi registrado e o histórico de exoneração foi preservado.' : 'Candidatura enviada com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível salvar a candidatura.' });
  }
});

router.get('/minha', login.requireUser, async (req, res) => {
  const user = await db.get('SELECT inscricao_enviada FROM users WHERE id = ? LIMIT 1', [req.session.user.id]);
  const row = await db.get('SELECT * FROM candidaturas WHERE usuario_id = ? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
  if (!row) return res.json({ encontrada: false, inscricao_enviada: Number(user?.inscricao_enviada || 0) === 1, etapa_liberada: 0 });
  res.json({ encontrada: true, inscricao_enviada: true, ...row });
});

router.get('/status/:id_jogador', login, async (req, res) => {
  try {
    let row;
    if (req.session.admin) {
      row = await db.get('SELECT personagem, id_jogador, etapa_liberada, status FROM candidaturas WHERE id_jogador = ? ORDER BY id DESC LIMIT 1', [req.params.id_jogador]);
    } else {
      row = await db.get('SELECT personagem, id_jogador, etapa_liberada, status FROM candidaturas WHERE usuario_id = ? AND id_jogador = ? ORDER BY id DESC LIMIT 1', [req.session.user.id, req.params.id_jogador]);
    }
    if (!row) return res.status(404).json({ encontrado: false, etapa_liberada: 0 });
    res.json({ encontrado: true, personagem: row.personagem, etapa_liberada: row.etapa_liberada || 0, status: row.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível consultar a candidatura.' });
  }
});

router.get('/', adminAuth, async (req, res) => {
  // O painel de fases mostra somente candidatos que ainda não ocupam
  // cargos de comando (GESTOR, SUB-GESTOR ou COORDENADOR).
  const rows = await db.all(`
    SELECT c.*, u.nome AS usuario_nome, u.username AS usuario_username, u.cargo_delta
    FROM candidaturas c
    LEFT JOIN users u ON u.id = c.usuario_id
    WHERE COALESCE(UPPER(u.cargo_delta), '') NOT IN ('GESTOR','SUB-GESTOR','COORDENADOR')
      AND COALESCE(UPPER(c.status), 'PENDENTE') NOT IN ('APROVADO','REPROVADO')
    ORDER BY c.id DESC
  `);
  res.json(rows);
});

router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const { etapa, status, observacao } = req.body || {};
    const atual = await db.get('SELECT * FROM candidaturas WHERE id = ?', [req.params.id]);
    if (!atual) return res.status(404).json({ erro: 'Candidatura não encontrada.' });

    let novaEtapaLiberada = atual.etapa_liberada || 0;
    if (etapa !== undefined) {
      const solicitada = Number(etapa);
      if (!Number.isInteger(solicitada) || solicitada < 0 || solicitada > 3) return res.status(400).json({ erro: 'Etapa inválida.' });
      // As etapas são liberadas em ordem e nunca pulam uma fase.
      if (solicitada > (atual.etapa_liberada || 0) + 1) return res.status(400).json({ erro: 'A próxima etapa deve ser liberada em ordem.' });
      novaEtapaLiberada = solicitada;
    }

    let novoStatus = status === undefined ? atual.status : String(status).toUpperCase();
    if (!['PENDENTE','APROVADO','REPROVADO'].includes(novoStatus)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    // A decisão final (APROVADO/REPROVADO) só pode ser tomada depois que as 3 etapas foram liberadas.
    if ((novoStatus === 'APROVADO' || novoStatus === 'REPROVADO') && novaEtapaLiberada < 3) {
      return res.status(400).json({ erro: 'A aprovação ou reprovação só pode ser definida após a conclusão das 3 etapas.' });
    }

    // responsavel_id aponta para admins; gestores são usuários comuns. Mantemos o responsável anterior.
    const responsavelId = req.session.admin?.id ?? null; // responsavel_id referencia admins; gestores entram nos logs como usuários
    const responsavelNome = req.session.admin?.nome || req.session.user?.nome || req.session.admin?.username || req.session.user?.username || 'Sistema';
    await db.run(
      `UPDATE candidaturas SET etapa_liberada = ?, etapa = ?, status = ?, observacao = COALESCE(?, observacao), responsavel_id = COALESCE(?, responsavel_id), atualizado_em = datetime('now') WHERE id = ?`,
      [novaEtapaLiberada, novaEtapaLiberada, novoStatus, observacao ?? null, responsavelId, req.params.id]
    );
    try {
      const acao = novoStatus === 'APROVADO' ? 'APROVACAO_CANDIDATURA' : novoStatus === 'REPROVADO' ? 'REPROVACAO_CANDIDATURA' : 'LIBERACAO_ETAPA';
      await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`, [
        String(req.session.admin?.cargo || req.session.user?.cargo || req.session.user?.cargo_delta || 'ADMINISTRADOR').toUpperCase(),
        responsavelId, responsavelNome, acao, 'CANDIDATURA', req.params.id,
        `Candidato ${atual.personagem || atual.id_jogador}: etapa ${atual.etapa_liberada || 0} -> ${novaEtapaLiberada}${novoStatus !== atual.status ? `; status ${atual.status || 'PENDENTE'} -> ${novoStatus}` : ''}`
      ]);
    } catch (logError) { console.error('Falha ao registrar log da candidatura:', logError); }

    // Somente após 3 etapas + aprovação final o usuário vira PILOTO PROBATORIO.
    if (novaEtapaLiberada >= 3 && novoStatus === 'APROVADO' && atual.usuario_id) {
      await db.run(`UPDATE users SET cargo_delta = 'PILOTO PROBATORIO', ativo = 1, status_conta = 'ATIVA', inscricao_enviada = 1 WHERE id = ?`, [atual.usuario_id]);
    }

    // Reprovação encerra a candidatura ativa e libera o usuário para uma nova inscrição.
    // Mantemos o registro no histórico para o Comando não perder a informação da decisão.
    if (novoStatus === 'REPROVADO') {
      await db.run(`
        INSERT INTO candidaturas_historico
        (candidatura_id, usuario_id, personagem, id_jogador, patente, tempo_pmc, idade_ic, disponibilidade, experiencia, motivo, etapa, etapa_liberada, status, observacao, responsavel_id, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REPROVADO', ?, ?, ?)
      `, [
        atual.id, atual.usuario_id, atual.personagem, atual.id_jogador, atual.patente || null,
        atual.tempo_pmc || null, atual.idade_ic || null, atual.disponibilidade || null,
        atual.experiencia || null, atual.motivo || null, novaEtapaLiberada, novaEtapaLiberada,
        observacao ?? atual.observacao ?? null, req.session.admin?.id ?? null, atual.criado_em || null
      ]);
      const del = await db.run('DELETE FROM candidaturas WHERE id = ?', [req.params.id]);
      if (Number(del?.changes || 0) !== 1) return res.status(409).json({ erro: 'A candidatura não pôde ser removida do banco de dados.' });
      if (atual.usuario_id) {
        await db.run('UPDATE users SET inscricao_enviada = 0 WHERE id = ?', [atual.usuario_id]);
      }
      return res.json({ sucesso: true, reprovado: true, novaInscricaoLiberada: true, mensagem: 'Candidato reprovado e removido das candidaturas. O usuário pode realizar uma nova inscrição.' });
    }

    res.json({ sucesso: true, promovido: novaEtapaLiberada >= 3 && novoStatus === 'APROVADO' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível atualizar.' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const atual = await db.get('SELECT id FROM candidaturas WHERE id = ?', [req.params.id]);
    if (!atual) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    const full = await db.get('SELECT * FROM candidaturas WHERE id = ?', [req.params.id]);
    await db.run(`
      INSERT INTO candidaturas_historico
      (candidatura_id, usuario_id, personagem, id_jogador, patente, tempo_pmc, idade_ic, disponibilidade, experiencia, motivo, etapa, etapa_liberada, status, observacao, responsavel_id, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DELETADA', ?, ?, ?)
    `, [
      full.id, full.usuario_id, full.personagem, full.id_jogador, full.patente || null, full.tempo_pmc || null,
      full.idade_ic || null, full.disponibilidade || null, full.experiencia || null, full.motivo || null,
      full.etapa || 0, full.etapa_liberada || 0, full.observacao || null, req.session.admin?.id ?? null, full.criado_em || null
    ]);
    const del = await db.run('DELETE FROM candidaturas WHERE id = ?', [req.params.id]);
    if (Number(del?.changes || 0) !== 1) return res.status(409).json({ erro: 'A candidatura não pôde ser removida do banco de dados.' });
    if (full.usuario_id) await db.run('UPDATE users SET inscricao_enviada = 0 WHERE id = ?', [full.usuario_id]);
    res.json({ sucesso: true, novaInscricaoLiberada: true, mensagem: 'Candidatura deletada. O usuário foi liberado para realizar uma nova inscrição.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível deletar a candidatura.' });
  }
});

module.exports = router;
