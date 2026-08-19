const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json(await db.all('SELECT * FROM membros ORDER BY personagem COLLATE NOCASE'));
});

router.post('/', auth, async (req, res) => {
  try {
    const { personagem, id_jogador, patente, cargo_delta, status, data_entrada, observacoes } = req.body || {};
    if (!personagem || !id_jogador) {
      return res.status(400).json({ erro: 'Personagem e ID são obrigatórios.' });
    }

    await db.run(
      `INSERT INTO membros
       (personagem, id_jogador, patente, cargo_delta, status, data_entrada, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [personagem, id_jogador, patente || null, cargo_delta || null, status || 'ATIVO', data_entrada || null, observacoes || null]
    );

    res.status(201).json({ sucesso: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível cadastrar o membro.' });
  }
});

module.exports = router;
