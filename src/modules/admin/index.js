/**
 * Админ-панель: /admin/*
 * Все разделы доступны только администраторам (requireAdmin).
 */
import { Router } from 'express';
import { requireAdmin } from '#src/middleware/auth.js';
import { ordersRepo } from '#src/modules/orders/orders.repository.js';
import { applicationsRepo } from '#src/modules/applications/applications.repository.js';

import dashboardRoutes from './dashboard.routes.js';
import ordersRoutes from './orders.routes.js';
import menuRoutes from './menu.routes.js';
import cafesRoutes from './cafes.routes.js';
import applicationsRoutes from './applications.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.use(requireAdmin);

// Счётчики в боковом меню (новые заказы и заявки)
router.use((req, res, next) => {
  res.locals.badges = {
    orders: ordersRepo.stats().counts.new ?? 0,
    applications: applicationsRepo.countNew(),
  };
  next();
});

router.use(dashboardRoutes);
router.use('/orders', ordersRoutes);
router.use('/menu', menuRoutes);
router.use('/cafes', cafesRoutes);
router.use('/applications', applicationsRoutes);
router.use('/users', usersRoutes);

export default router;
