/**
 * Публичные страницы: главная, контакты и заявка на подключение кафе.
 */
import { Router } from 'express';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { applicationsRepo } from '#src/modules/applications/applications.repository.js';
import { validate, text, optionalText, phone, z } from '#src/lib/validation.js';

const router = Router();

const TEAM = [
  { name: 'Жұмали Али', role: 'Дизайн және фронтенд' },
  { name: 'Анарбаев Ахрар', role: 'Бэкенд және деректер базасы' },
  { name: 'Ерболатұлы Құдірет', role: 'Клиенттермен жұмыс' },
  { name: 'Болатбекова Анель', role: 'Маркетинг және жарнама' },
];

router.get('/', (req, res) => {
  res.render('pages/home', { cafes: cafesRepo.listActive() });
});

router.get('/contacts', (req, res) => {
  res.render('pages/contacts', { title: 'Байланыс', team: TEAM });
});

/* ---------- Заявка от кафе (форма отправляется через htmx) ---------- */

const applicationSchema = z.object({
  cafe_name: text(120, { label: 'Кафе атауы', min: 2 }),
  contact_name: text(80, { label: 'Аты-жөніңіз', min: 2 }),
  phone: phone(),
  email: z.union([z.literal(''), z.string().trim().email('Email дұрыс емес')]).optional()
    .transform((value) => value || null),
  message: optionalText(1000),
});

router.post('/applications', (req, res) => {
  const { data, errors } = validate(applicationSchema, req.body);

  // Ответ — HTML-фрагмент, которым htmx заменяет форму
  if (errors) {
    return res.status(422).render('fragments/application-form', { values: req.body, errors });
  }
  applicationsRepo.create(data);
  res.render('fragments/application-success', { cafeName: data.cafe_name });
});

export default router;
