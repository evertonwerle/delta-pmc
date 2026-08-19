require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const database = require('./database');

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'delta-dev-secret-troque-depois',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/candidaturas', require('./routes/candidaturas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/membros', require('./routes/membros'));
app.use('/api/hierarquia', require('./routes/hierarquia'));
app.use('/api/conteudo', require('./routes/conteudo'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/hall', require('./routes/hall'));
app.use('/api/pilotos', require('./routes/pilotos'));
app.use('/api/admin', require('./routes/admin').router);
app.use('/api/relatorios-acoes', require('./routes/relatorios'));
app.use('/api/discord', require('./routes/discord'));
app.use('/api/fardamento-itens', require('./routes/fardamento'));

// Evita que uma rota /api inexistente devolva o index.html e cause erros de JSON no frontend.
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API não encontrada.' });
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

if (!process.env.VERCEL) {
app.listen(port, () => {
    console.log('');
    console.log('=========================================');
    console.log('       DELTA PMC - SERVIDOR ONLINE       ');
    console.log('=========================================');
    console.log(`Site: http://localhost:${port}`);
    console.log(`Banco ativo: ${database.dbPath}`);
    console.log('Não feche esta janela enquanto usar o site.');
    console.log('=========================================');
  });
}

module.exports = app;
