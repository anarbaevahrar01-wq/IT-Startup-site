/**
 * Корзина.
 *
 * Все изменения корзины работают и через htmx (без перезагрузки страницы),
 * и обычными формами (если JavaScript отключён) — прогрессивное улучшение.
 */
import { Router } from 'express';
import { addItem, setQuantity, summarizeCart, cartCount } from './cart.service.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { wantsFragment, toId, safeNextUrl, flash } from '#src/lib/http.js';

const router = Router();

/** Данные для страницы корзины / формы оформления. */
function cartViewModel(req) {
  const cart = summarizeCart(req.session);
  const tables = cart.cafe ? cafesRepo.tables.list(cart.cafe.id) : [];
  const selected = req.session.table;
  const selectedTableId = selected && cart.cafe && selected.cafeId === cart.cafe.id ? selected.tableId : null;
  return { cart, tables, selectedTableId };
}

/** Путь страницы, с которой пришёл запрос (для возврата без JavaScript). */
function refererPath(req) {
  try {
    return new URL(req.get('Referer')).pathname;
  } catch {
    return null;
  }
}

router.get('/cart', (req, res) => {
  res.render('pages/cart', { title: 'Себет', ...cartViewModel(req), values: {}, errors: null });
});

/** Добавить блюдо: кнопка «+» в карточке меню. */
router.post('/cart/items', (req, res) => {
  const result = addItem(req.session, toId(req.body.itemId));

  if (!wantsFragment(req)) {
    if (!result.ok) flash(req, 'error', 'Бұл тағам қазір қолжетімсіз');
    return res.redirect(303, safeNextUrl(refererPath(req), '/cart'));
  }

  if (!result.ok) {
    return res.render('fragments/toast', { type: 'error', message: 'Бұл тағам қазір қолжетімсіз' });
  }

  // Ответ: обновлённый счётчик в карточке + панель корзины + уведомление (через hx-swap-oob)
  const cart = summarizeCart(req.session);
  res.render('fragments/cart-updated', {
    item: result.item,
    quantity: req.session.cart.items[result.item.id],
    cart,
    oob: true,
    count: cartCount(req.session),
    message: result.switchedCafe
      ? 'Себет жаңа кафе үшін тазартылды'
      : `«${result.item.name}» себетке қосылды`,
  });
});

/** Изменить количество (кнопки − / + на странице корзины). */
router.post('/cart/items/:id', (req, res) => {
  const id = toId(req.params.id);
  setQuantity(req.session, id, Number(req.body.quantity));

  if (!wantsFragment(req)) return res.redirect(303, '/cart');
  res.render('fragments/cart-panel', { ...cartViewModel(req), count: cartCount(req.session), oob: true });
});

export default router;
