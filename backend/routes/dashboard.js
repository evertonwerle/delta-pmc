const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const pendentes = db.get("SELECT COUNT(*) AS total FROM candidaturas WHERE status = 'PENDENTE'").total;
  const membros = db.get("SELECT COUNT(*) AS total FROM membros WHERE status = 'ATIVO'").total;
  const etapa2 = db.get("SELECT COUNT(*) AS total FROM candidaturas WHERE etapa = 2 AND status = 'APROVADO'").total;
  const desligados = db.get(`
    SELECT COUNT(*) AS total FROM membros
    WHERE status = 'DESLIGADO'
      AND data_saida IS NOT NULL
      AND strftime('%Y-%m', data_saida) = strftime('%Y-%m', 'now')
  `).total;

  res.json({
    candidaturasPendentes: pendentes,
    membrosAtivos: membros,
    aprovadosEtapa2: etapa2,
    desligamentosMes: desligados
  });
});

module.exports = router;
