/**
 * Репозиторий меню: категории и позиции (блюда/напитки).
 */
import { db } from '#src/db/index.js';

const sql = {
  // --- категории ---
  listCategories: db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM menu_items m WHERE m.category_id = c.id) AS items_count
    FROM categories c WHERE c.cafe_id = ? ORDER BY c.position, c.id`),
  findCategory: db.prepare('SELECT * FROM categories WHERE id = ?'),
  createCategory: db.prepare(`
    INSERT INTO categories (cafe_id, name, position)
    VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM categories WHERE cafe_id = ?))`),
  renameCategory: db.prepare('UPDATE categories SET name = ? WHERE id = ?'),
  removeCategory: db.prepare('DELETE FROM categories WHERE id = ?'),

  // --- позиции меню ---
  listItems: db.prepare(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
    WHERE m.cafe_id = ?
    ORDER BY c.position, m.position, m.id`),
  listAvailable: db.prepare(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
    WHERE m.cafe_id = ? AND m.is_available = 1
    ORDER BY c.position, m.position, m.id`),
  findItem: db.prepare(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
    WHERE m.id = ?`),
  createItem: db.prepare(`
    INSERT INTO menu_items (cafe_id, category_id, name, description, price, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?)`),
  updateItem: db.prepare(`
    UPDATE menu_items
    SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?
    WHERE id = ?`),
  toggleItem: db.prepare('UPDATE menu_items SET is_available = 1 - is_available WHERE id = ?'),
  removeItem: db.prepare('DELETE FROM menu_items WHERE id = ?'),
};

export const menuRepo = {
  categories: {
    list: (cafeId) => sql.listCategories.all(cafeId),
    findById: (id) => sql.findCategory.get(id),
    create: (cafeId, name) => sql.createCategory.run(cafeId, name, cafeId),
    rename: (id, name) => sql.renameCategory.run(name, id),
    remove: (id) => sql.removeCategory.run(id),
  },

  items: {
    listByCafe: (cafeId) => sql.listItems.all(cafeId),
    /**
     * Доступные позиции с необязательным поиском по названию/описанию.
     * Фильтруем в JS: lower() в SQLite понимает только латиницу,
     * а toLocaleLowerCase корректно работает с кириллицей и казахскими буквами.
     */
    searchAvailable(cafeId, query = '') {
      const items = sql.listAvailable.all(cafeId);
      const q = String(query).trim().slice(0, 60).toLocaleLowerCase('kk');
      if (!q) return items;
      return items.filter((item) =>
        `${item.name} ${item.description ?? ''}`.toLocaleLowerCase('kk').includes(q));
    },
    findById: (id) => sql.findItem.get(id),
    create(data) {
      const result = sql.createItem.run(
        data.cafe_id, data.category_id ?? null, data.name, data.description ?? null,
        data.price, data.image_url ?? null, data.is_available ? 1 : 0,
      );
      return Number(result.lastInsertRowid);
    },
    update: (id, data) =>
      sql.updateItem.run(
        data.category_id ?? null, data.name, data.description ?? null,
        data.price, data.image_url ?? null, data.is_available ? 1 : 0, id,
      ),
    toggle: (id) => sql.toggleItem.run(id),
    remove: (id) => sql.removeItem.run(id),
  },
};

/**
 * Группирует позиции по категориям для отображения меню.
 * @returns {{ id: number|null, name: string, items: object[] }[]}
 */
export function groupByCategory(items, categories) {
  const groups = categories.map((category) => ({ id: category.id, name: category.name, items: [] }));
  const byId = new Map(groups.map((group) => [group.id, group]));
  const other = { id: null, name: 'Басқа', items: [] };

  for (const item of items) {
    (byId.get(item.category_id) ?? other).items.push(item);
  }
  return [...groups, other].filter((group) => group.items.length > 0);
}
