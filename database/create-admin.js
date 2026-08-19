const bcrypt = require('../backend/node_modules/bcryptjs');
const db = require('../backend/database');

const username = process.argv[2] || 'comando.delta';
const password = process.argv[3] || 'delta123';
const nome = process.argv[4] || 'Comando Delta';
const cargo = process.argv[5] || 'Administrador';

// Garante que as tabelas existam antes de criar o primeiro administrador.
db.exec(require('fs').readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8'));

const hash = bcrypt.hashSync(password, 12);
const existente = db.get('SELECT id FROM admins WHERE username = ?', [username]);

if (existente) {
  db.run(
    'UPDATE admins SET password_hash = ?, nome = ?, cargo = ?, ativo = 1 WHERE id = ?',
    [hash, nome, cargo, existente.id]
  );
  console.log('Administrador atualizado com sucesso!');
} else {
  db.run(
    'INSERT INTO admins (username, password_hash, nome, cargo) VALUES (?, ?, ?, ?)',
    [username, hash, nome, cargo]
  );
  console.log('Administrador criado com sucesso!');
}

console.log(`Usuário: ${username}`);
console.log(`Senha: ${password}`);
