const db = require('../database');
const TOP_CARGOS = ['GESTOR', 'SUB-GESTOR', 'COORDENADOR'];

async function cargoAtual(req) {
  if (req.session?.admin) return String(req.session.admin.cargo || 'ADMINISTRADOR').toUpperCase();
  const id = req.session?.user?.id;
  if (!id) return '';
  const row = await db.get('SELECT cargo_delta, ativo FROM users WHERE id = ? LIMIT 1', [id]);
  if (!row || Number(row.ativo) !== 1) return '';
  req.session.user.cargo = row.cargo_delta || 'PILOTO PROBATORIO';
  return String(row.cargo_delta || '').toUpperCase();
}

async function isHierarchyManager(req) {
  if (req.session?.admin) return true;
  return TOP_CARGOS.includes(await cargoAtual(req));
}

module.exports = async function hierarchyAuth(req, res, next) {
  if (!await isHierarchyManager(req)) {
    return res.status(403).json({ erro: 'Acesso restrito a GESTOR, SUB-GESTOR e COORDENADOR.' });
  }
  next();
};

module.exports.TOP_CARGOS = TOP_CARGOS;
module.exports.isHierarchyManager = isHierarchyManager;
module.exports.cargoAtual = cargoAtual;
