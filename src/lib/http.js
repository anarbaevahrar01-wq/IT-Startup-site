/**
 * Помощники для работы с запросами htmx.
 *
 * htmx отправляет заголовки:
 *   HX-Request: true  — запрос сделан htmx (а не обычным переходом);
 *   HX-Boosted: true  — это «ускоренный» переход по ссылке/форме (hx-boost),
 *                       сервер должен вернуть полную страницу.
 */

/** Запрос пришёл от htmx и ждёт ФРАГМЕНТ страницы (не boosted-переход). */
export const wantsFragment = (req) =>
  req.get('HX-Request') === 'true' && req.get('HX-Boosted') !== 'true';

/**
 * Редирект, понятный и браузеру, и htmx.
 * Для фрагментных htmx-запросов используем заголовок HX-Redirect,
 * для остальных — обычный 303 See Other (после POST → GET).
 */
export function redirect(req, res, url) {
  if (wantsFragment(req)) {
    res.set('HX-Redirect', url);
    return res.status(204).end();
  }
  return res.redirect(303, url);
}

/**
 * Flash-сообщение: сохраняется в сессии и показывается
 * всплывающим уведомлением на следующей отрисованной странице.
 * @param {'success'|'error'|'info'} type
 */
export function flash(req, type, message) {
  req.session.flash ??= [];
  req.session.flash.push({ type, message });
}

/** Безопасный внутренний адрес для параметра ?next= (защита от open redirect). */
export function safeNextUrl(value, fallback = '/') {
  const url = String(value ?? '');
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') ? url : fallback;
}

/** Парсит положительное целое из параметров маршрута. */
export function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
