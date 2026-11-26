/**
 * Репозиторий заказов + запросы для статистики админ-панели.
 */
import { db } from '#src/db/index.js';
import { config } from '#src/config/env.js';

// Модификатор SQLite для перевода UTC в местное время, например '+5 hours'
const TZ = `${config.tzOffsetHours >= 0 ? '+' : ''}${config.tzOffsetHours} hours`;

const ORDER_SELECT = `
  SELECT o.*, c.name AS cafe_name, c.slug AS cafe_slug,
         t.number AS table_number, t.label AS table_label,
         (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id) AS items_count
  FROM orders o
  JOIN cafes c ON c.id = o.cafe_id
  LEFT JOIN dining_tables t ON t.id = o.table_id`;

const sql = {
  insertOrder: db.prepare(`
    INSERT INTO orders (code, cafe_id, table_id, user_id, customer_name, phone, comment, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  insertItem: db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)`),
  codeExists: db.prepare('SELECT 1 FROM orders WHERE code = ?'),
  findByCode: db.prepare(`${ORDER_SELECT} WHERE o.code = ?`),
  findById: db.prepare(`${ORDER_SELECT} WHERE o.id = ?`),
  items: db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id'),
  listByUser: db.prepare(`${ORDER_SELECT} WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 50`),
  updateStatus: db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`),

  // --- статистика ---
  today: db.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status != 'cancelled' AND date(created_at, '${TZ}') = date('now', '${TZ}')`),
  countByStatus: db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status'),
  revenueByDay: db.prepare(`
    SELECT date(created_at, '${TZ}') AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status != 'cancelled' AND date(created_at, '${TZ}') >= date('now', '${TZ}', ?)
    GROUP BY day ORDER BY day`),
  topItems: db.prepare(`
    SELECT i.name, SUM(i.quantity) AS quantity, SUM(i.quantity * i.price) AS revenue
    FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.status != 'cancelled'
    GROUP BY i.name ORDER BY quantity DESC LIMIT ?`),
  averageCheck: db.prepare(`SELECT COALESCE(ROUND(AVG(total)), 0) AS value FROM orders WHERE status != 'cancelled'`),
};

export const ordersRepo = {
  codeExists: (code) => Boolean(sql.codeExists.get(code)),

  /** Создаёт заказ с позициями. Вызывать внутри transaction(). */
  create(order, items) {
    const { lastInsertRowid } = sql.insertOrder.run(
      order.code, order.cafe_id, order.table_id ?? null, order.user_id ?? null,
      order.customer_name, order.phone ?? null, order.comment ?? null, order.total,
    );
    const orderId = Number(lastInsertRowid);
    for (const item of items) {
      sql.insertItem.run(orderId, item.menu_item_id, item.name, item.price, item.quantity);
    }
    return orderId;
  },

  findByCode: (code) => sql.findByCode.get(code),
  findById: (id) => sql.findById.get(id),
  items: (orderId) => sql.items.all(orderId),
  listByUser: (userId) => sql.listByUser.all(userId),
  updateStatus: (id, status) => sql.updateStatus.run(status, id),

  /**
   * Список для админки с фильтрами. Запрос собирается динамически,
   * но все значения передаются параметрами (без подстановки в SQL).
   */
  list({ status, cafeId, search, limit = 100 } = {}) {
    const where = [];
    const params = [];
    if (status === 'active') where.push(`o.status IN ('new', 'preparing', 'ready')`);
    else if (status) { where.push('o.status = ?'); params.push(status); }
    if (cafeId) { where.push('o.cafe_id = ?'); params.push(cafeId); }
    if (search) {
      where.push(`(o.code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return db.prepare(`${ORDER_SELECT} ${whereSql} ORDER BY o.id DESC LIMIT ?`).all(...params, limit);
  },

  stats() {
    const counts = Object.fromEntries(sql.countByStatus.all().map((row) => [row.status, row.count]));
    return {
      today: sql.today.get(),
      counts,
      active: (counts.new ?? 0) + (counts.preparing ?? 0) + (counts.ready ?? 0),
      averageCheck: sql.averageCheck.get().value,
    };
  },

  /** Выручка по дням за последние N дней (дни без заказов заполняются нулями). */
  revenueByDay(days = 7) {
    const rows = sql.revenueByDay.all(`-${days - 1} days`);
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const result = [];
    const now = new Date(Date.now() + config.tzOffsetHours * 3600_000);
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400_000).toISOString().slice(0, 10);
      result.push(byDay.get(day) ?? { day, orders: 0, revenue: 0 });
    }
    return result;
  },

  topItems: (limit = 5) => sql.topItems.all(limit),
};
