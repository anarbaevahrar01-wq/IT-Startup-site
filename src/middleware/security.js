/**
 * Безопасность HTTP.
 *
 *  - helmet: заголовки безопасности и Content-Security-Policy
 *    (скрипты только со своего домена — htmx и app.js раздаются локально);
 *  - verifyOrigin: защита от CSRF. Изменяющие запросы (POST/PATCH/DELETE)
 *    принимаются только если заголовок Origin (или Referer) совпадает с нашим
 *    хостом. Вместе с cookie SameSite=Lax этого достаточно и не нужны токены.
 */
import helmet from 'helmet';
import { config } from '#src/config/env.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      // googleusercontent.com — фото профиля Google в личном кабинете и админке
      'img-src': ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      // В разработке сайт работает по http — апгрейд до https сломал бы ресурсы
      'upgrade-insecure-requests': config.isProd ? [] : null,
    },
  },
});

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const source = req.get('Origin') ?? req.get('Referer');
  if (source) {
    try {
      if (new URL(source).host === req.get('Host')) return next();
    } catch {
      /* некорректный URL — отклоняем ниже */
    }
  }
  res.status(403).send('Сұрау қабылданбады (CSRF)');
}
