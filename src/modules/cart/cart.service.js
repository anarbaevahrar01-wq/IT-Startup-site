/**
 * Корзина гостя.
 *
 * Хранится в сессии в минимальном виде: { cafeId, items: { [menuItemId]: количество } }.
 * Цены и названия НЕ хранятся — при каждом показе берутся из базы,
 * поэтому гость всегда видит актуальные цены, а подделать цену нельзя.
 *
 * Корзина привязана к одному кафе: добавление блюда из другого кафе
 * начинает новую корзину.
 */
import { menuRepo } from '#src/modules/menu/menu.repository.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';

export const MAX_QUANTITY = 50;

function getCart(session) {
  session.cart ??= { cafeId: null, items: {} };
  return session.cart;
}

/** Общее количество единиц в корзине (для значка в шапке). */
export function cartCount(session) {
  const items = session.cart?.items ?? {};
  return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}

/**
 * Добавляет блюдо в корзину.
 * @returns {{ ok: boolean, item?: object, switchedCafe?: boolean }}
 */
export function addItem(session, menuItemId) {
  const item = menuRepo.items.findById(menuItemId);
  if (!item || !item.is_available) return { ok: false };

  const cart = getCart(session);
  let switchedCafe = false;
  if (cart.cafeId !== item.cafe_id) {
    switchedCafe = cart.cafeId !== null && Object.keys(cart.items).length > 0;
    cart.cafeId = item.cafe_id;
    cart.items = {};
  }

  const current = cart.items[item.id] ?? 0;
  cart.items[item.id] = Math.min(current + 1, MAX_QUANTITY);
  return { ok: true, item, switchedCafe };
}

/** Устанавливает количество; 0 — удаляет позицию. */
export function setQuantity(session, menuItemId, quantity) {
  const cart = getCart(session);
  const qty = Math.max(0, Math.min(Math.trunc(quantity) || 0, MAX_QUANTITY));
  if (qty === 0) delete cart.items[menuItemId];
  else if (cart.items[menuItemId] !== undefined) cart.items[menuItemId] = qty;
}

export function clearCart(session) {
  session.cart = { cafeId: null, items: {} };
}

/**
 * Полное содержимое корзины с актуальными ценами из базы.
 * Недоступные или удалённые блюда автоматически убираются.
 */
export function summarizeCart(session) {
  const cart = getCart(session);
  const lines = [];

  for (const [id, quantity] of Object.entries(cart.items)) {
    const item = menuRepo.items.findById(Number(id));
    if (!item || !item.is_available || item.cafe_id !== cart.cafeId) {
      delete cart.items[id];
      continue;
    }
    lines.push({ item, quantity, subtotal: item.price * quantity });
  }

  const cafe = cart.cafeId ? cafesRepo.findById(cart.cafeId) : null;
  return {
    cafe,
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
    isEmpty: lines.length === 0,
  };
}
