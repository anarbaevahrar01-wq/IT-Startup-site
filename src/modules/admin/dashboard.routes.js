/**
 * Главная админки: ключевые показатели, выручка за неделю,
 * активные заказы в реальном времени, популярные блюда.
 */
import { Router } from 'express';
import { ordersRepo } from '#src/modules/orders/orders.repository.js';
import { usersRepo } from '#src/modules/auth/users.repository.js';

const router = Router();

const WEEKDAYS = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб']; // Вс..Сб по-казахски

function revenueChart() {
  const days = ordersRepo.revenueByDay(7);
  const max = Math.max(...days.map((d) => d.revenue), 1);
  return days.map((d) => ({
    ...d,
    weekday: WEEKDAYS[new Date(`${d.day}T00:00:00Z`).getUTCDay()],
    percent: Math.round((d.revenue / max) * 100),
  }));
}

router.get('/', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Басқару тақтасы',
    section: 'dashboard',
    stats: ordersRepo.stats(),
    usersCount: usersRepo.count(),
    chart: revenueChart(),
    topItems: ordersRepo.topItems(5),
    activeOrders: ordersRepo.list({ status: 'active', limit: 8 }),
  });
});

/** Фрагмент «Активные заказы» — обновляется через htmx каждые 10 секунд. */
router.get('/live-orders', (req, res) => {
  res.render('admin/_live-orders', { activeOrders: ordersRepo.list({ status: 'active', limit: 8 }) });
});

export default router;
