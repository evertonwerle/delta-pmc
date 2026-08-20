const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

function usuarioValido(v) {
  return /^[a-zA-Z0-9._-]{3,30}$/.test(String(v || ''));
}

router.post('/register', async (req, res) => {
  try {
    const { usuario, senha, nome } = req.body || {};
    if (!usuarioValido(usuario)) {
      return res.status(400).json({ erro: 'O usuário deve ter 3 a 30 caracteres e usar apenas letras, números, ponto, _ ou -.' });
    }
    if (!senha || String(senha).length < 6) {
      return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
    }
    if (!nome || String(nome).trim().length < 2) {
      return res.status(400).json({ erro: 'Informe seu nome.' });
    }

    const existeAdmin = await db.get('SELECT id FROM admins WHERE username = ? LIMIT 1', [usuario]);
    const existeUser = await db.get('SELECT id FROM users WHERE username = ? LIMIT 1', [usuario]);
    if (existeAdmin || existeUser) {
      return res.status(409).json({ erro: 'Esse usuário já existe.' });
    }

    const hash = bcrypt.hashSync(String(senha), 10);
    const result = await db.run(
      'INSERT INTO users (username, password_hash, nome, ativo, inscricao_enviada) VALUES (?, ?, ?, 1, 0)',
      [usuario, hash, String(nome).trim()]
    );

    req.session.user = { id: Number(result.lastInsertRowid), username: usuario, nome: String(nome).trim(), cargo: 'PILOTO PROBATORIO', role: 'user' };
    req.session.admin = null;
    res.status(201).json({ sucesso: true, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível criar a conta.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body || {};
    if (!usuario || !senha) return res.status(400).json({ erro: 'Preencha usuário e senha.' });

    const admin = await db.get('SELECT * FROM admins WHERE username = ? AND ativo = 1 LIMIT 1', [usuario]);
    if (admin && bcrypt.compareSync(senha, admin.password_hash)) {
      req.session.admin = { id: admin.id, username: admin.username, nome: admin.nome, cargo: admin.cargo, role: 'admin' };
      req.session.user = null;
      await db.run('UPDATE admins SET ultimo_login = datetime(\'now\') WHERE id = ?', [admin.id]);
      await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,['ADMINISTRADOR',admin.id,admin.nome||admin.username,'LOGIN','ADMIN',admin.id,'Login administrativo realizado']);
      return res.json({ sucesso: true, role: 'admin', admin: req.session.admin });
    }

    const user = await db.get("SELECT * FROM users WHERE username = ? AND (ativo = 1 OR status_conta = 'EXONERADO') LIMIT 1", [usuario]);
    if (user && bcrypt.compareSync(senha, user.password_hash)) {
      if (String(user.status_conta || '').toUpperCase() === 'BANIDO') {
        return res.status(403).json({ erro: 'Esta conta foi banida permanentemente e não pode retornar.' });
      }
      const aprovado = await db.get(`SELECT id FROM candidaturas WHERE usuario_id = ? AND status = 'APROVADO' LIMIT 1`, [user.id]);
      req.session.user = { id: user.id, username: user.username, nome: user.nome, cargo: user.cargo_delta || 'PILOTO PROBATORIO', aprovado: !!aprovado, role: 'user' };
      req.session.admin = null;
      await db.run('UPDATE users SET ultimo_login = datetime(\'now\') WHERE id = ?', [user.id]);
      await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,[String(user.cargo_delta||'PILOTO').toUpperCase(),user.id,user.nome,'LOGIN','USUARIO',user.id,'Login realizado']);
      return res.json({ sucesso: true, role: 'user', user: req.session.user });
    }

    return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno no login.' });
  }
});

router.post('/logout', async (req, res) => {
  const a=req.session?.admin ? ['ADMINISTRADOR',req.session.admin.id,req.session.admin.nome||req.session.admin.username] : ['USUARIO',req.session?.user?.id,req.session?.user?.nome||req.session?.user?.username];
  try{await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,[a[0],a[1]||null,a[2]||'', 'LOGOUT','SESSAO',a[1]||null,'Logout realizado']);}catch(e){}
  req.session.destroy(() => res.json({ sucesso: true }));
});

router.get('/me', async (req, res) => {
  if (req.session.admin) return res.json({ autenticado: true, role: 'admin', admin: req.session.admin });
  if (req.session.user) {
    const row = await db.get('SELECT id, username, nome, cargo_delta, ativo, inscricao_enviada, status_conta FROM users WHERE id = ? LIMIT 1', [req.session.user.id]);
    if (!row || (Number(row.ativo) !== 1 && String(row.status_conta || '').toUpperCase() !== 'EXONERADO')) {
      return res.json({ autenticado: false, role: null });
    }
    const aprovado = await db.get(`SELECT id FROM candidaturas WHERE usuario_id = ? AND status = 'APROVADO' LIMIT 1`, [row.id]);
    req.session.user = { ...req.session.user, id: row.id, username: row.username, nome: row.nome, cargo: row.cargo_delta || 'PILOTO PROBATORIO', inscricao_enviada: Number(row.inscricao_enviada) === 1, aprovado: !!aprovado, role: 'user' };
    return res.json({ autenticado: true, role: 'user', user: req.session.user });
  }
  res.json({ autenticado: false, role: null });
});

module.exports = router;
