/**
 * Репозиторий пользователей.
 * Хеш пароля наружу отдаётся только методом findByEmailWithPassword (для входа).
 */
import { db } from '#src/db/index.js';

const PUBLIC_FIELDS = 'id, name, email, role, avatar_url, created_at';

const sql = {
  findById: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`),
  findByEmailWithPassword: db.prepare('SELECT * FROM users WHERE email = ?'),
  emailExists: db.prepare('SELECT 1 FROM users WHERE email = ?'),
  create: db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'),
  findByGoogleId: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE google_id = ?`),
  findByEmail: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE email = ?`),
  createFromGoogle: db.prepare(`
    INSERT INTO users (name, email, password_hash, google_id, avatar_url) VALUES (?, ?, '!', ?, ?)`),
  linkGoogle: db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?'),
  list: db.prepare(`
    SELECT ${PUBLIC_FIELDS},
           (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
    FROM users u ORDER BY u.id DESC`),
  count: db.prepare('SELECT COUNT(*) AS n FROM users'),
  countAdmins: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`),
  setRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM users WHERE id = ?'),
};

export const usersRepo = {
  findById: (id) => sql.findById.get(id),
  findByEmailWithPassword: (email) => sql.findByEmailWithPassword.get(email),
  emailExists: (email) => Boolean(sql.emailExists.get(email)),
  create({ name, email, passwordHash, role = 'customer' }) {
    return Number(sql.create.run(name, email, passwordHash, role).lastInsertRowid);
  },
  list: () => sql.list.all(),

  /* --- Google --- */
  findByGoogleId: (googleId) => sql.findByGoogleId.get(googleId),
  findByEmail: (email) => sql.findByEmail.get(email),
  createFromGoogle({ name, email, googleId, avatarUrl }) {
    return Number(sql.createFromGoogle.run(name, email, googleId, avatarUrl ?? null).lastInsertRowid);
  },
  /** Привязывает Google-аккаунт к существующему пользователю (и обновляет фото). */
  linkGoogle: (id, googleId, avatarUrl) => sql.linkGoogle.run(googleId, avatarUrl ?? null, id),
  count: () => sql.count.get().n,
  countAdmins: () => sql.countAdmins.get().n,
  setRole: (id, role) => sql.setRole.run(role, id),
  remove: (id) => sql.remove.run(id),
};
