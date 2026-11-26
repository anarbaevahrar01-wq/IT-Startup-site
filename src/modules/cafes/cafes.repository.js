/**
 * Репозиторий кафе и столов.
 * Здесь только SQL — никакой бизнес-логики и HTTP.
 */
import { db } from '#src/db/index.js';

const CAFE_FIELDS = ['slug', 'name', 'tagline', 'description', 'address', 'hours', 'phone', 'instagram', 'cover_url', 'is_active'];

const sql = {
  listActive: db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM menu_items m WHERE m.cafe_id = c.id AND m.is_available = 1) AS items_count
    FROM cafes c
    WHERE c.is_active = 1
    ORDER BY c.created_at`),
  listAll: db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM menu_items m WHERE m.cafe_id = c.id)    AS items_count,
           (SELECT COUNT(*) FROM dining_tables t WHERE t.cafe_id = c.id) AS tables_count,
           (SELECT COUNT(*) FROM orders o WHERE o.cafe_id = c.id)        AS orders_count
    FROM cafes c
    ORDER BY c.created_at`),
  findById: db.prepare('SELECT * FROM cafes WHERE id = ?'),
  findBySlug: db.prepare('SELECT * FROM cafes WHERE slug = ?'),
  create: db.prepare(`
    INSERT INTO cafes (${CAFE_FIELDS.join(', ')})
    VALUES (${CAFE_FIELDS.map(() => '?').join(', ')})`),
  update: db.prepare(`
    UPDATE cafes SET ${CAFE_FIELDS.map((field) => `${field} = ?`).join(', ')}
    WHERE id = ?`),
  remove: db.prepare('DELETE FROM cafes WHERE id = ?'),

  listTables: db.prepare('SELECT * FROM dining_tables WHERE cafe_id = ? ORDER BY number'),
  findTable: db.prepare('SELECT * FROM dining_tables WHERE cafe_id = ? AND number = ?'),
  findTableById: db.prepare('SELECT * FROM dining_tables WHERE id = ? AND cafe_id = ?'),
  nextTableNumber: db.prepare('SELECT COALESCE(MAX(number), 0) + 1 AS next FROM dining_tables WHERE cafe_id = ?'),
  addTable: db.prepare('INSERT INTO dining_tables (cafe_id, number, label) VALUES (?, ?, ?)'),
  updateTableLabel: db.prepare('UPDATE dining_tables SET label = ? WHERE id = ? AND cafe_id = ?'),
  removeTable: db.prepare('DELETE FROM dining_tables WHERE id = ? AND cafe_id = ?'),
};

/** Порядок значений для INSERT/UPDATE. node:sqlite не принимает undefined и boolean. */
const values = (data) =>
  CAFE_FIELDS.map((field) => {
    const value = data[field];
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value ?? null;
  });

export const cafesRepo = {
  listActive: () => sql.listActive.all(),
  listAll: () => sql.listAll.all(),
  findById: (id) => sql.findById.get(id),
  findBySlug: (slug) => sql.findBySlug.get(slug),

  create(data) {
    return Number(sql.create.run(...values({ is_active: true, ...data })).lastInsertRowid);
  },
  update: (id, data) => sql.update.run(...values(data), id),
  remove: (id) => sql.remove.run(id),

  tables: {
    list: (cafeId) => sql.listTables.all(cafeId),
    findByNumber: (cafeId, number) => sql.findTable.get(cafeId, number),
    findById: (cafeId, id) => sql.findTableById.get(id, cafeId),
    /** Добавляет стол со следующим свободным номером. */
    addNext(cafeId, label = null) {
      const { next } = sql.nextTableNumber.get(cafeId);
      sql.addTable.run(cafeId, next, label);
      return next;
    },
    updateLabel: (cafeId, id, label) => sql.updateTableLabel.run(label || null, id, cafeId),
    remove: (cafeId, id) => sql.removeTable.run(id, cafeId),
  },
};
