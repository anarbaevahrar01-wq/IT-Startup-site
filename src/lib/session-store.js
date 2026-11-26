/**
 * Хранилище сессий express-session в таблице SQLite `sessions`.
 * Сессии переживают перезапуск сервера (в отличие от MemoryStore).
 */
import session from 'express-session';

const ONE_DAY = 24 * 60 * 60 * 1000;

export class SqliteSessionStore extends session.Store {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db) {
    super();
    this.statements = {
      get: db.prepare('SELECT data FROM sessions WHERE sid = ? AND expires_at > ?'),
      set: db.prepare(`
        INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT (sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`),
      touch: db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?'),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      prune: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
    };

    // Раз в час удаляем просроченные сессии. unref() — таймер не держит процесс.
    setInterval(() => this.statements.prune.run(Date.now()), 60 * 60 * 1000).unref();
  }

  static expiresAt(sess) {
    const expires = sess?.cookie?.expires;
    return expires ? new Date(expires).getTime() : Date.now() + ONE_DAY;
  }

  get(sid, callback) {
    try {
      const row = this.statements.get.get(sid, Date.now());
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback) {
    try {
      this.statements.set.run(sid, JSON.stringify(sess), SqliteSessionStore.expiresAt(sess));
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sess, callback) {
    try {
      this.statements.touch.run(SqliteSessionStore.expiresAt(sess), sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.statements.destroy.run(sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }
}
