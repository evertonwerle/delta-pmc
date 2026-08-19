require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../backend/database');

const username = process.argv[2] || 'comando.delta';
const password = process.argv[3] || 'delta123';
const nome = process.argv[4] || 'Comando Delta';
const cargo = process.argv[5] || 'Administrador';

(async () => {
  await db.ready;
  const hash = bcrypt.hashSync(password, 12);
  const existente = await db.get('SELECT id FROM admins WHERE username = ?', [username]);

  if (existente) {
    await db.run(
      'UPDATE admins SET password_hash = ?, nome = ?, cargo = ?, ativo = 1 WHERE id = ?',
      [hash, nome, cargo, existente.id]
    );
    console.log('Administrador atualizado com sucesso!');
  } else {
    await db.run(
      'INSERT INTO admins (username, password_hash, nome, cargo) VALUES (?, ?, ?, ?)',
      [username, hash, nome, cargo]
    );
    console.log('Administrador criado com sucesso!');
  }

  console.log(`Usuário: ${username}`);
  console.log(`Senha: ${password}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
