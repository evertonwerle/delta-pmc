const express = require('express');
const db = require('../database');
const hierarchyAuth = require('../middleware/hierarchy');
const contentAuth = require('../middleware/content');

const router = express.Router();

function normalizeCategoria(c) {
  const v = String(c || '').toUpperCase();
  if (!['MANUAL','ETAPA','EDITAL','APOSTILA'].includes(v)) throw new Error('Categoria inválida.');
  return v;
}

router.get('/', async (req, res) => {
  try {
    // O conteúdo é filtrado por perfil: Manual só para pilotos aprovados;
    // Apostila para candidatos/inscritos ainda não aprovados. Gestores e admin veem tudo.
    const privileged = !!req.session?.admin || ['GESTOR','SUB-GESTOR','COORDENADOR'].includes(String(req.session?.user?.cargo || '').toUpperCase());
    if (privileged) {
      const rows = await db.all(`SELECT id, categoria, titulo, conteudo, ordem, ativo, atualizado_em FROM documentos WHERE ativo = 1 ORDER BY categoria, ordem, id`);
      return res.json({ documentos: rows, acesso_manual: true, acesso_apostila: true });
    }

    const userId = req.session?.user?.id;
    if (!userId) {
      const rows = await db.all(`SELECT id, categoria, titulo, conteudo, ordem, ativo, atualizado_em FROM documentos WHERE ativo = 1 AND categoria = 'EDITAL' ORDER BY ordem, id`);
      return res.json({ documentos: rows, acesso_manual: false, acesso_apostila: false });
    }

    const candidatura = await db.get(`SELECT status FROM candidaturas WHERE usuario_id = ? ORDER BY id DESC LIMIT 1`, [userId]);
    const aprovado = String(candidatura?.status || '').toUpperCase() === 'APROVADO';
    const categoriaPermitida = aprovado ? 'MANUAL' : (candidatura ? 'APOSTILA' : null);
    const rows = categoriaPermitida
      ? await db.all(`SELECT id, categoria, titulo, conteudo, ordem, ativo, atualizado_em FROM documentos WHERE ativo = 1 AND categoria IN ('EDITAL', ?) ORDER BY categoria, ordem, id`, [categoriaPermitida])
      : await db.all(`SELECT id, categoria, titulo, conteudo, ordem, ativo, atualizado_em FROM documentos WHERE ativo = 1 AND categoria = 'EDITAL' ORDER BY ordem, id`);
    res.json({ documentos: rows, acesso_manual: aprovado, acesso_apostila: !!categoriaPermitida && !aprovado });
  } catch (e) {
    console.error(e); res.status(500).json({ erro: 'Não foi possível carregar o conteúdo.' });
  }
});

router.get('/admin', hierarchyAuth, async (req, res) => {
  try {
    const rows = await db.all(`SELECT id, categoria, titulo, conteudo, ordem, ativo, atualizado_em FROM documentos ORDER BY categoria, ordem, id`);
    res.json({ documentos: rows });
  } catch (e) {
    console.error(e); res.status(500).json({ erro: 'Não foi possível carregar os documentos.' });
  }
});

router.post('/', contentAuth, async (req, res) => {
  try {
    const categoria = normalizeCategoria(req.body.categoria);
    const titulo = String(req.body.titulo || '').trim();
    const conteudo = String(req.body.conteudo || '').trim();
    const ordem = Number(req.body.ordem || 0);
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo são obrigatórios.' });
    if (categoria === 'ETAPA' && ![1,2,3].includes(ordem)) return res.status(400).json({ erro: 'Etapa deve ser 1, 2 ou 3.' });
    const result = await db.run(`INSERT INTO documentos (categoria,titulo,conteudo,ordem,ativo,atualizado_em) VALUES (?,?,?,?,1,datetime('now'))`, [categoria,titulo,conteudo,ordem]);
    res.status(201).json({ sucesso: true, id: Number(result.lastInsertRowid) });
  } catch (e) { console.error(e); res.status(400).json({ erro: e.message || 'Não foi possível criar o conteúdo.' }); }
});

router.patch('/:id', contentAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const atual = await db.get('SELECT * FROM documentos WHERE id = ?', [id]);
    if (!atual) return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
    const categoria = normalizeCategoria(req.body.categoria ?? atual.categoria);
    const titulo = String(req.body.titulo ?? atual.titulo).trim();
    const conteudo = String(req.body.conteudo ?? atual.conteudo).trim();
    const ordem = Number(req.body.ordem ?? atual.ordem);
    const ativo = req.body.ativo === undefined ? atual.ativo : (req.body.ativo ? 1 : 0);
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo são obrigatórios.' });
    if (categoria === 'ETAPA' && ![1,2,3].includes(ordem)) return res.status(400).json({ erro: 'Etapa deve ser 1, 2 ou 3.' });
    await db.run(`UPDATE documentos SET categoria=?, titulo=?, conteudo=?, ordem=?, ativo=?, atualizado_em=datetime('now') WHERE id=?`, [categoria,titulo,conteudo,ordem,ativo,id]);
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(400).json({ erro: e.message || 'Não foi possível atualizar.' }); }
});

router.delete('/:id', contentAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const atual = await db.get('SELECT id, categoria, titulo FROM documentos WHERE id = ?', [id]);
    if (!atual) return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
    if (!['MANUAL','APOSTILA'].includes(atual.categoria)) return res.status(400).json({ erro: 'Somente tópicos do Manual ou da Apostila podem ser excluídos.' });
    const result = await db.run('DELETE FROM documentos WHERE id = ?', [id]);
    if (Number(result?.changes || 0) !== 1) return res.status(409).json({ erro: 'O conteúdo não pôde ser excluído do banco de dados.' });
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Não foi possível excluir o conteúdo.' }); }
});

module.exports = router;
