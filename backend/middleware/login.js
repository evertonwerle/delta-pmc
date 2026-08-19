module.exports = function requireLogin(req, res, next) {
  if (!req.session.user && !req.session.admin) {
    return res.status(401).json({ erro: 'Você precisa estar logado.' });
  }
  next();
};

module.exports.requireUser = function requireUser(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ erro: 'Apenas usuários comuns podem usar esta função.' });
  }
  next();
};
