/**
 * Обработчики 404 и непредвиденных ошибок.
 * Express 5 сам передаёт сюда ошибки из async-обработчиков.
 */
import { config } from '#src/config/env.js';
import { wantsFragment } from '#src/lib/http.js';

export function notFound(req, res) {
  res.status(404).render('pages/errors/error', {
    title: 'Бет табылмады',
    status: 404,
    message: 'Сіз іздеген бет жоқ немесе жойылған.',
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  console.error(`[error] ${req.method} ${req.originalUrl}\n`, error);
  if (res.headersSent) return;

  const status = error.status ?? 500;

  // Для htmx-фрагментов — всплывающее уведомление вместо целой страницы
  if (wantsFragment(req)) {
    return res.status(status).render('fragments/toast', {
      type: 'error',
      message: 'Қате орын алды. Қайталап көріңіз.',
    });
  }

  res.status(status).render('pages/errors/error', {
    title: 'Қате',
    status,
    message: 'Серверде қате орын алды. Кейінірек қайталап көріңіз.',
    details: config.isProd ? null : error.stack,
  });
}
