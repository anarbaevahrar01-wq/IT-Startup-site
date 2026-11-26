/**
 * Общие переменные для всех шаблонов (res.locals):
 * текущий путь, flash-сообщения, количество товаров в корзине.
 */
import { cartCount } from '#src/modules/cart/cart.service.js';

export function templateLocals(req, res, next) {
  res.locals.currentPath = req.path;
  res.locals.cartCount = cartCount(req.session);

  // Flash-сообщения показываются один раз и удаляются из сессии
  res.locals.flash = req.session.flash ?? [];
  if (req.session.flash) delete req.session.flash;

  // hx-boost: после редиректа (POST → 303 → GET) показываем в адресной строке итоговый адрес,
  // а если POST вернул страницу с ошибками (422) — адрес не меняем.
  if (req.get('HX-Boosted') === 'true') {
    res.set('HX-Push-Url', req.method === 'GET' ? req.originalUrl : 'false');
  }

  // Страницы зависят от сессии — не кешировать их в браузере и прокси
  res.set('Cache-Control', 'no-store');
  next();
}
