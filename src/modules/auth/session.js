/**
 * Общая логика входа — используется и для пароля, и для Google.
 */

/**
 * Входит под пользователем. Идентификатор сессии меняется (защита от
 * фиксации сессии), но корзина, выбранный стол и недавние заказы сохраняются.
 */
export function signIn(req, userId) {
  const { cart, table, recentOrders } = req.session;
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      Object.assign(req.session, { userId, cart, table, recentOrders });
      resolve();
    });
  });
}
