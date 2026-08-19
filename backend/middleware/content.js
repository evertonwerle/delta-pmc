const db = require('../database');
const TOP_CONTENT_CARGOS = ['GESTOR', 'SUB-GESTOR'];

function canEditContent(req) {
  if (req.session?.admin) return true;
  const id = req.session?.user?.id;
  if (!id) return false;
  const row = db.get('SELECT cargo_delta, ativo FROM users WHERE id = ? LIMIT 1', [id]);
  if (!row || Number(row.ativo) !== 1) return false;
  req.session.user.cargo = row.cargo_delta || 'PILOTO PROBATORIO';
  return TOP_CONTENT_CARGOS.includes(String(row.cargo_delta || '').toUpperCase());
}

module.exports = function contentAuth(req, res, next) {
  if (!canEditContent(req)) return res.status(403).json({ erro: 'Somente GESTOR e SUB-GESTOR podem editar, adicionar ou excluir conteúdo.' });
  next();
};
module.exports.canEditContent = canEditContent;
