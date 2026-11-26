/**
 * Админка → Пользователи: список, смена роли, удаление.
 * Нельзя понизить или удалить самого себя — чтобы не потерять доступ.
 */
import { Router } from 'express';
import { usersRepo } from '#src/modules/auth/users.repository.js';
import { toId } from '#src/lib/http.js';

const router = Router();

router.get('/', (req, res) => {
  res.render('admin/users/index', { title: 'Пайдаланушылар', section: 'users', users: usersRepo.list() });
});

/** Найти пользователя, которого можно менять (не текущего админа). */
function editableUser(req) {
  const user = usersRepo.findById(toId(req.params.id));
  return user && user.id !== req.user.id ? user : null;
}

router.post('/:id/role', (req, res) => {
  const user = editableUser(req);
  // В интерфейсе кнопки для себя нет — это защита на стороне сервера
  if (!user) return res.status(400).end();

  usersRepo.setRole(user.id, user.role === 'admin' ? 'customer' : 'admin');
  const updated = usersRepo.list().find((u) => u.id === user.id);
  res.render('admin/users/_row', { user: updated });
});

router.delete('/:id', (req, res) => {
  const user = editableUser(req);
  if (!user) return res.status(400).end();
  usersRepo.remove(user.id);
  res.send('');
});

export default router;
