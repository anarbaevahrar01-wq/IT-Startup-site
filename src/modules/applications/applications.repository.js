/**
 * Заявки на подключение кафе к QR DINE.
 */
import { db } from '#src/db/index.js';

const sql = {
  create: db.prepare(`
    INSERT INTO applications (cafe_name, contact_name, phone, email, message) VALUES (?, ?, ?, ?, ?)`),
  list: db.prepare('SELECT * FROM applications ORDER BY id DESC'),
  findById: db.prepare('SELECT * FROM applications WHERE id = ?'),
  countNew: db.prepare(`SELECT COUNT(*) AS n FROM applications WHERE status = 'new'`),
  setStatus: db.prepare('UPDATE applications SET status = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM applications WHERE id = ?'),
};

export const applicationsRepo = {
  create: (data) =>
    sql.create.run(data.cafe_name, data.contact_name, data.phone, data.email ?? null, data.message ?? null),
  list: () => sql.list.all(),
  findById: (id) => sql.findById.get(id),
  countNew: () => sql.countNew.get().n,
  setStatus: (id, status) => sql.setStatus.run(status, id),
  remove: (id) => sql.remove.run(id),
};
