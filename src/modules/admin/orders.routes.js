/**
 * Админка → Заказы: список с фильтрами и автообновлением,
 * карточка заказа, смена статуса.
 */
import { Router } from 'express';
import { ordersRepo } from '#src/modules/orders/orders.repository.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { STATUS_KEYS } from '#src/modules/orders/order-status.js';
import { toId, redirect, flash } from '#src/lib/http.js';

const router = Router();

/** Фильтры из query-строки (?status=new&cafe=1&q=АБВ). */
function readFilters(query) {
  const status = query.status === 'all' || STATUS_KEYS.includes(query.status) ? query.status : 'active';
  return {
    status,
    cafeId: toId(query.cafe),
    search: String(query.q ?? '').trim().slice(0, 40),
  };
}

const listOrders = (filters) =>
  ordersRepo.list({ ...filters, status: filters.status === 'all' ? null : filters.status });

router.get('/', (req, res) => {
  const filters = readFilters(req.query);
  res.render('admin/orders/index', {
    title: 'Тапсырыстар',
    section: 'orders',
    filters,
    orders: listOrders(filters),
    cafes: cafesRepo.listAll(),
    counts: ordersRepo.stats().counts,
  });
});

/** Только строки таблицы — для автообновления через htmx. */
router.get('/rows', (req, res) => {
  res.render('admin/orders/_rows', { orders: listOrders(readFilters(req.query)) });
});

router.get('/:id', (req, res, next) => {
  const order = ordersRepo.findById(toId(req.params.id));
  if (!order) return next();
  res.render('admin/orders/show', {
    title: `Тапсырыс ${order.code}`,
    section: 'orders',
    order,
    items: ordersRepo.items(order.id),
  });
});

/**
 * Смена статуса. Из таблицы (htmx) возвращаем обновлённую строку,
 * со страницы заказа — перенаправляем обратно.
 */
router.post('/:id/status', (req, res, next) => {
  const order = ordersRepo.findById(toId(req.params.id));
  if (!order) return next();
  if (!STATUS_KEYS.includes(req.body.status)) return res.status(400).end();

  ordersRepo.updateStatus(order.id, req.body.status);

  if (req.body.from === 'row') {
    return res.render('admin/orders/_row', { order: ordersRepo.findById(order.id) });
  }
  flash(req, 'success', 'Мәртебе жаңартылды');
  redirect(req, res, `/admin/orders/${order.id}`);
});

export default router;
