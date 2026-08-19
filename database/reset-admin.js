const bcrypt = require('bcryptjs');
const db = require('../backend/database');
const username = process.argv[2] || 'admin';
const password = process.argv[3];

if (!password || password.length < 8) {
  console.error('Uso: node database/reset-admin.js admin SUA_SENHA_FORTE');
  process.exit(1);
}

(async () => {
  await db.ready;
  const admin = await db.get('SELECT id FROM admins WHERE username=? LIMIT 1',[username]);
  if (!admin) { console.error('Administrador não encontrado.'); process.exitCode = 1; return; }
  await db.run('UPDATE admins SET password_hash=?,ativo=1 WHERE id=?',[bcrypt.hashSync(password,12),admin.id]);
  console.log(`Senha do administrador ${username} atualizada.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
