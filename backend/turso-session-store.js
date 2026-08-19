const session = require('express-session');
const db = require('./database');

/**
 * Store de sessão persistente no Turso/SQLite.
 * O MemoryStore padrão do express-session não é adequado para funções
 * serverless porque uma nova instância pode não compartilhar a memória.
 */
class TursoSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.ttl = Number(options.ttl || 8 * 60 * 60 * 1000);
  }

  expiry(sess) {
    const expires = sess?.cookie?.expires;
    if (expires) {
      const value = new Date(expires).getTime();
      if (Number.isFinite(value)) return value;
    }
    const maxAge = Number(sess?.cookie?.maxAge);
    return Date.now() + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge : this.ttl);
  }

  get(sid, callback) {
    db.get('SELECT sess, expire FROM sessions WHERE sid=? LIMIT 1', [sid])
      .then(async row => {
        if (!row) return callback(null, null);
        if (Number(row.expire) <= Date.now()) {
          await db.run('DELETE FROM sessions WHERE sid=?', [sid]);
          return callback(null, null);
        }
        try {
          callback(null, JSON.parse(String(row.sess)));
        } catch (error) {
          callback(error);
        }
      })
      .catch(callback);
  }

  set(sid, sess, callback) {
    const expire = this.expiry(sess);
    const payload = JSON.stringify(sess);
    db.run(`INSERT INTO sessions (sid,sess,expire) VALUES (?,?,?)
      ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess,expire=excluded.expire`,
      [sid, payload, expire])
      .then(() => callback?.(null))
      .catch(error => callback?.(error));
  }

  touch(sid, sess, callback) {
    db.run('UPDATE sessions SET expire=? WHERE sid=?', [this.expiry(sess), sid])
      .then(() => callback?.(null))
      .catch(error => callback?.(error));
  }

  destroy(sid, callback) {
    db.run('DELETE FROM sessions WHERE sid=?', [sid])
      .then(() => callback?.(null))
      .catch(error => callback?.(error));
  }

  clear(callback) {
    db.run('DELETE FROM sessions')
      .then(() => callback?.(null))
      .catch(error => callback?.(error));
  }

  length(callback) {
    db.get('SELECT COUNT(*) AS total FROM sessions WHERE expire>?', [Date.now()])
      .then(row => callback(null, Number(row?.total || 0)))
      .catch(error => callback(error));
  }

  all(callback) {
    db.all('SELECT sess FROM sessions WHERE expire>? ORDER BY expire DESC', [Date.now()])
      .then(rows => callback(null, rows.map(row => JSON.parse(String(row.sess)))))
      .catch(error => callback(error));
  }
}

module.exports = TursoSessionStore;
