/**
 * Сборка Express-приложения: шаблоны, статика, сессии, маршруты.
 * Запуск HTTP-сервера — в src/server.js (так приложение удобно тестировать).
 */
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import nunjucks from 'nunjucks';

import { config } from '#src/config/env.js';
import { db } from '#src/db/index.js';
import { SqliteSessionStore } from '#src/lib/session-store.js';
import { logoSvg, markShapes, CSS_VAR_COLORS } from '#src/lib/brand.js';
import { formatMoney, formatDateTime, formatTime, timeAgo, initials } from '#src/lib/format.js';
import { ORDER_STATUSES, APPLICATION_STATUSES } from '#src/modules/orders/order-status.js';

import { securityHeaders, verifyOrigin } from '#src/middleware/security.js';
import { loadUser } from '#src/middleware/auth.js';
import { templateLocals } from '#src/middleware/locals.js';
import { notFound, errorHandler } from '#src/middleware/errors.js';

import publicRoutes from '#src/modules/public/public.routes.js';
import cafesRoutes from '#src/modules/cafes/cafes.routes.js';
import cartRoutes from '#src/modules/cart/cart.routes.js';
import ordersRoutes from '#src/modules/orders/orders.routes.js';
import authRoutes from '#src/modules/auth/auth.routes.js';
import googleAuthRoutes from '#src/modules/auth/google.routes.js';
import adminRoutes from '#src/modules/admin/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1); // за обратным прокси (Render, Nginx)

  /* ---------- Шаблоны Nunjucks ---------- */
  const views = nunjucks.configure(config.paths.views, {
    autoescape: true,           // экранирование HTML по умолчанию — защита от XSS
    express: app,
    noCache: !config.isProd,    // в разработке шаблоны перечитываются без перезапуска
  });
  app.set('view engine', 'njk');

  views.addFilter('money', formatMoney);
  views.addFilter('datetime', formatDateTime);
  views.addFilter('time', formatTime);
  views.addFilter('ago', timeAgo);
  views.addFilter('initials', initials);

  const safe = (html) => new nunjucks.runtime.SafeString(html);
  /** {{ icon('cart') }} — иконка из SVG-спрайта public/img/icons.svg */
  views.addGlobal('icon', (name, className = '') =>
    safe(`<svg class="icon ${className}" aria-hidden="true"><use href="/img/icons.svg#i-${name}"></use></svg>`));
  /** {{ logo({ tagline: true, className: 'x' }) }} — инлайн-логотип */
  views.addGlobal('logo', (options = {}) => safe(logoSvg(options)));
  /** {{ brandMark() }} — только знак (квадрат) */
  views.addGlobal('brandMark', () =>
    safe(`<svg class="brand-mark" viewBox="0 0 120 120" aria-hidden="true">${markShapes(CSS_VAR_COLORS)}</svg>`));
  views.addGlobal('ORDER_STATUSES', ORDER_STATUSES);
  views.addGlobal('APPLICATION_STATUSES', APPLICATION_STATUSES);
  views.addGlobal('baseUrl', config.baseUrl);
  views.addGlobal('assetVersion', Date.now().toString(36)); // сброс кеша CSS/JS при перезапуске
  views.addGlobal('year', new Date().getFullYear());
  views.addGlobal('googleEnabled', config.google.enabled); // показывать ли кнопку «Google арқылы кіру»

  /* ---------- Базовые middleware ---------- */
  app.use(securityHeaders);
  app.use(compression());

  /* ---------- Статика ---------- */
  const staticOptions = { maxAge: config.isProd ? '7d' : 0 };
  app.use(express.static(config.paths.public, staticOptions));
  app.use('/uploads', express.static(config.paths.uploads, staticOptions));
  // Библиотеки из node_modules раздаём сами — без внешних CDN
  const vendor = (pkg) => path.join(config.paths.nodeModules, pkg);
  app.use('/vendor/htmx', express.static(vendor('htmx.org/dist'), staticOptions));
  app.use('/vendor/inter', express.static(vendor('@fontsource-variable/inter'), staticOptions));
  app.use('/vendor/montserrat', express.static(vendor('@fontsource-variable/montserrat'), staticOptions));

  /* ---------- Тело запроса, сессии, пользователь ---------- */
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(
    session({
      name: 'qrdine.sid',
      secret: config.sessionSecret,
      store: new SqliteSessionStore(db),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      },
    }),
  );
  app.use(verifyOrigin);
  app.use(loadUser);
  app.use(templateLocals);

  /* ---------- Маршруты ---------- */
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(publicRoutes);
  app.use(authRoutes);
  app.use(googleAuthRoutes);
  app.use(cafesRoutes);
  app.use(cartRoutes);
  app.use(ordersRoutes);
  app.use('/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
