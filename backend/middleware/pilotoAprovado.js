const db = require('../database');

const COMANDO = ['GESTOR', 'SUB-GESTOR', 'COORDENADOR'];

module.exports = function pilotoAprovado(req, res, next) {
  const id = req.session?.user?.id;

  // Conta administrativa geral não possui um piloto associado.
  if (!id || req.session?.admin) {
    return res.status(403).json({ erro: 'Esta função operacional exige uma conta de piloto ou de comando vinculada a um usuário.' });
  }

  const user = db.get(
    'SELECT id, cargo_delta, ativo, status_conta FROM users WHERE id = ? LIMIT 1',
    [id]
  );

  if (!user || Number(user.ativo) !== 1) {
    return res.status(403).json({ erro: 'Sua conta não está ativa.' });
  }

  const cargo = String(user.cargo_delta || '').toUpperCase();
  const eComando = COMANDO.includes(cargo);

  // Gestor, Sub-Gestor e Coordenador são usuários-piloto com acesso
  // operacional integral, mesmo que a candidatura original não esteja
  // mais marcada como APROVADO.
  if (!eComando) {
    const aprovado = db.get(
      "SELECT id FROM candidaturas WHERE usuario_id = ? AND status = 'APROVADO' LIMIT 1",
      [id]
    );
    if (!aprovado) {
      return res.status(403).json({ erro: 'Acesso exclusivo aos pilotos aprovados.' });
    }
  }

  req.session.user.cargo = user.cargo_delta || 'PILOTO PROBATORIO';
  req.pilotoUserId = id;
  req.isComando = eComando;
  next();
};
