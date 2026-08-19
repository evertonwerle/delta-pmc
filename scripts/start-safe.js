const { spawn, execSync } = require('child_process');
const net = require('net');
const os = require('os');

const port = Number(process.env.PORT || 3000);

function portIsOpen(port, host='127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.createConnection({port, host});
    const done = value => { try { socket.destroy(); } catch (_) {} resolve(value); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(400, () => done(false));
  });
}

function killPortOwner(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
      const pids = [...new Set((output.match(/\b\d+\s*$/gm) || []).map(x => x.trim()).filter(x => x && x !== String(process.pid)))];
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' }); console.log(`[DELTA] Processo anterior na porta ${port} encerrado (PID ${pid}).`); } catch (_) {}
      }
    } else {
      try { execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' }); console.log(`[DELTA] Processo anterior na porta ${port} encerrado.`); } catch (_) {}
    }
  } catch (_) {}
}

(async () => {
  if (await portIsOpen(port)) {
    console.log(`[DELTA] A porta ${port} já estava ocupada. Encerrando o processo anterior para evitar EADDRINUSE e iniciar a versão atual.`);
    killPortOwner(port);
    await new Promise(r => setTimeout(r, 700));
  }

  const child = spawn(process.execPath, ['server.js'], {
    cwd: require('path').join(__dirname, '..', 'backend'),
    env: process.env,
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
})();
