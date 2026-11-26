/**
 * Регистрация, вход, выход и личный кабинет гостя.
 */
import { Router } from 'express';
import { usersRepo } from './users.repository.js';
import { ordersRepo } from '#src/modules/orders/orders.repository.js';
import { hashPassword, verifyPassword } from '#src/lib/password.js';
import { validate, text, email, z } from '#src/lib/validation.js';
import { redirect, flash, safeNextUrl } from '#src/lib/http.js';
import { requireAuth } from '#src/middleware/auth.js';

const router = Router();

/**
 * Входит под пользователем. Идентификатор сессии меняется (защита от
 * фиксации сессии), но корзина и выбранный стол сохраняются.
 */
function signIn(req, userId) {
  const { cart, table, recentOrders } = req.session;
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      Object.assign(req.session, { userId, cart, table, recentOrders });
      resolve();
    });
  });
}

/* ---------- Вход ---------- */

router.get('/login', (req, res) => {
  if (req.user) return res.redirect(303, '/account');
  res.render('pages/auth/login', { title: 'Кіру', next: safeNextUrl(req.query.next, ''), values: {}, errors: null });
});

const loginSchema = z.object({
  email: email(),
  password: z.string().min(1, 'Құпиясөзді енгізіңіз'),
});

router.post('/login', async (req, res) => {
  const next = safeNextUrl(req.body.next, '');
  const { data, errors } = validate(loginSchema, req.body);
  const fail = (formErrors) =>
    res.status(422).render('pages/auth/login', { title: 'Кіру', next, values: req.body, errors: formErrors });

  if (errors) return fail(errors);

  const user = usersRepo.findByEmailWithPassword(data.email);
  // Одинаковое сообщение для «нет такого email» и «неверный пароль»
  if (!user || !(await verifyPassword(data.password, user.password_hash))) {
    return fail({ _form: 'Email немесе құпиясөз қате' });
  }

  await signIn(req, user.id);
  flash(req, 'success', `Қош келдіңіз, ${user.name}!`);
  redirect(req, res, next || (user.role === 'admin' ? '/admin' : '/account'));
});

/* ---------- Регистрация ---------- */

router.get('/register', (req, res) => {
  if (req.user) return res.redirect(303, '/account');
  res.render('pages/auth/register', { title: 'Тіркелу', values: {}, errors: null });
});

const registerSchema = z
  .object({
    name: text(60, { label: 'Аты-жөніңіз', min: 2 }),
    email: email(),
    password: z.string().min(8, 'Құпиясөз кемінде 8 таңба болуы керек').max(100),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ['password_confirm'],
    message: 'Құпиясөздер сәйкес келмейді',
  });

router.post('/register', async (req, res) => {
  const { data, errors } = validate(registerSchema, req.body);
  const fail = (formErrors) =>
    res.status(422).render('pages/auth/register', { title: 'Тіркелу', values: req.body, errors: formErrors });

  if (errors) return fail(errors);
  if (usersRepo.emailExists(data.email)) return fail({ email: 'Бұл email тіркелген' });

  const userId = usersRepo.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
  });

  await signIn(req, userId);
  flash(req, 'success', 'Тіркелу сәтті аяқталды!');
  redirect(req, res, '/account');
});

/* ---------- Выход ---------- */

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('qrdine.sid');
    redirect(req, res, '/');
  });
});

/* ---------- Личный кабинет ---------- */

router.get('/account', requireAuth, (req, res) => {
  res.render('pages/account/index', {
    title: 'Жеке кабинет',
    orders: ordersRepo.listByUser(req.user.id),
  });
});

export default router;
