/**
 * Оформление заказа: проверка корзины и стола, расчёт суммы,
 * сохранение в одной транзакции.
 */
import { randomInt } from 'node:crypto';
import { transaction } from '#src/db/index.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { summarizeCart, clearCart } from '#src/modules/cart/cart.service.js';
import { ordersRepo } from './orders.repository.js';

// Без похожих символов (0/O, 1/I), чтобы код было легко продиктовать
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateOrderCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!ordersRepo.codeExists(code)) return code;
  }
}

export class OrderError extends Error {}

/**
 * Создаёт заказ из корзины в сессии.
 * @param {object} params
 * @param {object} params.session — req.session
 * @param {object|null} params.user — текущий пользователь (если вошёл)
 * @param {{customer_name:string, phone:string|null, comment:string|null, table_id:number}} params.input
 * @returns {string} публичный код заказа
 */
export function placeOrder({ session, user, input }) {
  const cart = summarizeCart(session);
  if (cart.isEmpty) throw new OrderError('Себет бос');

  const table = cafesRepo.tables.findById(cart.cafe.id, input.table_id);
  if (!table) throw new OrderError('Үстелді таңдаңыз');

  const code = generateOrderCode();

  transaction(() => {
    ordersRepo.create(
      {
        code,
        cafe_id: cart.cafe.id,
        table_id: table.id,
        user_id: user?.id ?? null,
        customer_name: input.customer_name,
        phone: input.phone,
        comment: input.comment,
        total: cart.total,
      },
      cart.lines.map((line) => ({
        menu_item_id: line.item.id,
        name: line.item.name,
        price: line.item.price,
        quantity: line.quantity,
      })),
    );
  });

  clearCart(session);
  // Коды заказов гостя без аккаунта — чтобы показать «Мои заказы» в этой сессии
  session.recentOrders = [code, ...(session.recentOrders ?? [])].slice(0, 10);
  return code;
}
