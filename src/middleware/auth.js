/**
 * Аутентификация и авторизация.
 *
 * loadUser     — подгружает пользователя из сессии в req.user (на каждом запросе);
 * requireAuth  — пускает только вошедших;
 * requireAdmin — пускает только администраторов.
 */
import { usersRepo } from '#src/modules/auth/users.repository.js';
import { redirect } from '#src/lib/http.js';

export function loadUser(req, res, next) {
  const userId = req.session.userId;
  req.user = userId ? (usersRepo.findById(userId) ?? null) : null;
  // Пользователя удалили, а сессия осталась — забываем его
  if (userId && !req.user) delete req.session.userId;
  res.locals.currentUser = req.user;
  next();
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  return redirect(req, res, `/login?next=${encodeURIComponent(req.originalUrl)}`);
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  if (!req.user) return redirect(req, res, `/login?next=${encodeURIComponent(req.originalUrl)}`);
  return res.status(403).render('pages/errors/error', {
    title: 'Рұқсат жоқ',
    status: 403,
    message: 'Бұл бет тек әкімшілерге арналған.',
  });
}
