/**
 * Админка → Заявки от кафе на подключение.
 */
import { Router } from 'express';
import { applicationsRepo } from '#src/modules/applications/applications.repository.js';
import { APPLICATION_STATUSES } from '#src/modules/orders/order-status.js';
import { toId } from '#src/lib/http.js';

const router = Router();

router.get('/', (req, res) => {
  res.render('admin/applications/index', {
    title: 'Өтінімдер',
    section: 'applications',
    applications: applicationsRepo.list(),
  });
});

router.post('/:id/status', (req, res, next) => {
  const id = toId(req.params.id);
  if (!applicationsRepo.findById(id) || !APPLICATION_STATUSES[req.body.status]) return next();
  applicationsRepo.setStatus(id, req.body.status);
  res.render('admin/applications/_card', { application: applicationsRepo.findById(id) });
});

router.delete('/:id', (req, res) => {
  applicationsRepo.remove(toId(req.params.id));
  res.send('');
});

export default router;
