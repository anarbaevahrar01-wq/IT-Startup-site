/**
 * Заказы гостя: оформление и страница статуса с автообновлением.
 */
import { Router } from 'express';
import { ordersRepo } from './orders.repository.js';
import { placeOrder, OrderError } from './orders.service.js';
import { PROGRESS_STEPS, isActiveStatus } from './order-status.js';
import { summarizeCart } from '#src/modules/cart/cart.service.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { validate, text, optionalText, int, z } from '#src/lib/validation.js';
import { redirect } from '#src/lib/http.js';

const router = Router();

const checkoutSchema = z.object({
  customer_name: text(60, { label: 'Атыңыз', min: 2 }),
  phone: optionalText(20),
  table_id: int({ min: 1, label: 'Үстел' }),
  comment: optionalText(300),
});

router.post('/orders', (req, res) => {
  const { data, errors } = validate(checkoutSchema, req.body);

  const renderWithErrors = (formErrors) => {
    const cart = summarizeCart(req.session);
    res.status(422).render('pages/cart', {
      title: 'Себет',
      cart,
      tables: cart.cafe ? cafesRepo.tables.list(cart.cafe.id) : [],
      selectedTableId: Number(req.body.table_id) || null,
      values: req.body,
      errors: formErrors,
    });
  };

  if (errors) return renderWithErrors(errors);

  try {
    const code = placeOrder({ session: req.session, user: req.user, input: data });
    return redirect(req, res, `/orders/${code}`);
  } catch (error) {
    if (error instanceof OrderError) return renderWithErrors({ _form: error.message });
    throw error;
  }
});

/** Данные заказа для страницы и для фрагмента статуса. */
function loadOrder(code) {
  const order = ordersRepo.findByCode(String(code).toUpperCase());
  if (!order) return null;
  return {
    order,
    items: ordersRepo.items(order.id),
    steps: PROGRESS_STEPS,
    stepIndex: PROGRESS_STEPS.indexOf(order.status),
    isActive: isActiveStatus(order.status),
  };
}

router.get('/orders/:code', (req, res, next) => {
  const model = loadOrder(req.params.code);
  if (!model) return next();
  res.render('pages/order', { title: `Тапсырыс ${model.order.code}`, ...model });
});

/**
 * Фрагмент статуса — htmx запрашивает его каждые 5 секунд.
 * Когда заказ завершён, отвечаем кодом 286: это сигнал htmx прекратить опрос.
 */
router.get('/orders/:code/status', (req, res, next) => {
  const model = loadOrder(req.params.code);
  if (!model) return next();
  res.status(model.isActive ? 200 : 286).render('fragments/order-status', model);
});

export default router;
