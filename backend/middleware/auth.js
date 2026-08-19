const db = require('../database');
const TOP_CARGOS = ['GESTOR', 'SUB-GESTOR', 'COORDENADOR'];

async function isAdminOrManager(req) {
  if (req.session?.admin) return true;
  const id = req.session?.user?.id;
  if (!id) return false;
  const row = await db.get('SELECT cargo_delta, ativo FROM users WHERE id = ? LIMIT 1', [id]);
  if (!row || Number(row.ativo) !== 1) return false;
  req.session.user.cargo = row.cargo_delta || 'PILOTO PROBATORIO';
  return TOP_CARGOS.includes(String(row.cargo_delta || '').toUpperCase());
}

module.exports = async function adminAuth(req, res, next) {
  if (!await isAdminOrManager(req)) {
    return res.status(403).json({ erro: 'Acesso restrito ao Administrador, Gestor, Sub-Gestor e Coordenador.' });
  }
  next();
};
module.exports.isAdminOrManager = isAdminOrManager;
module.exports.TOP_CARGOS = TOP_CARGOS;
