/**
 * Админка → Кафе: создание/редактирование заведений,
 * столы и QR-коды для печати.
 */
import { Router } from 'express';
import QRCode from 'qrcode';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { uploadImage, uploadedUrl, removeUpload } from '#src/lib/upload.js';
import { validate, text, optionalText, checkbox, z } from '#src/lib/validation.js';
import { toId, redirect, flash } from '#src/lib/http.js';
import { config } from '#src/config/env.js';
import { BRAND_COLORS } from '#src/lib/brand.js';

const router = Router();

/** Ссылка, которая зашивается в QR-код стола. */
const tableUrl = (cafe, table) => `${config.baseUrl}/t/${cafe.slug}/${table.number}`;

/** QR-код в виде SVG в фирменном цвете. */
const qrSvg = (url) =>
  QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: BRAND_COLORS.ink, light: '#FFFFFF' },
  });

/* ---------- Список и форма ---------- */

router.get('/', (req, res) => {
  res.render('admin/cafes/index', { title: 'Кафелер', section: 'cafes', cafes: cafesRepo.listAll() });
});

const cafeSchema = z.object({
  name: text(80, { label: 'Атауы', min: 2 }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, 'Тек латын әріптері, сандар және сызықша (2–40 таңба)'),
  tagline: optionalText(120),
  description: optionalText(1000),
  address: optionalText(160),
  hours: optionalText(60),
  phone: optionalText(30),
  instagram: optionalText(60).transform((value) => value?.replace(/^@/, '') ?? null),
  is_active: checkbox(),
  remove_image: checkbox(),
});

function renderForm(res, { cafe, values, errors, status = 200 }) {
  res.status(status).render('admin/cafes/form', {
    title: cafe ? `${cafe.name} — баптаулар` : 'Жаңа кафе',
    section: 'cafes',
    cafe,
    values,
    errors,
    tables: cafe ? cafesRepo.tables.list(cafe.id) : [],
  });
}

/** Общая проверка формы: схема + уникальность slug + ошибка загрузки. */
function validateCafe(req, currentId = null) {
  const { data, errors } = validate(cafeSchema, req.body);
  const allErrors = { ...errors };
  if (data) {
    const other = cafesRepo.findBySlug(data.slug);
    if (other && other.id !== currentId) allErrors.slug = 'Бұл адрес бос емес';
  }
  if (req.uploadError) allErrors.image = req.uploadError;
  return { data, errors: Object.keys(allErrors).length ? allErrors : null };
}

router.get('/new', (req, res) => {
  renderForm(res, { cafe: null, values: { is_active: true }, errors: null });
});

router.post('/', uploadImage, (req, res) => {
  const { data, errors } = validateCafe(req);
  if (errors) {
    removeUpload(uploadedUrl(req.file));
    return renderForm(res, { cafe: null, values: req.body, errors, status: 422 });
  }

  const cafeId = cafesRepo.create({ ...data, cover_url: uploadedUrl(req.file) });
  // Сразу создаём 4 стола — их можно изменить позже
  for (let i = 0; i < 4; i++) cafesRepo.tables.addNext(cafeId);

  flash(req, 'success', `«${data.name}» кафесі қосылды`);
  redirect(req, res, `/admin/cafes/${cafeId}`);
});

router.get('/:id', (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();
  renderForm(res, { cafe, values: cafe, errors: null });
});

router.post('/:id', uploadImage, (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();

  const { data, errors } = validateCafe(req, cafe.id);
  if (errors) {
    removeUpload(uploadedUrl(req.file));
    return renderForm(res, { cafe, values: { ...req.body, cover_url: cafe.cover_url }, errors, status: 422 });
  }

  let coverUrl = cafe.cover_url;
  if (req.file || data.remove_image) {
    removeUpload(cafe.cover_url);
    coverUrl = uploadedUrl(req.file);
  }

  cafesRepo.update(cafe.id, { ...data, cover_url: coverUrl });
  flash(req, 'success', 'Өзгерістер сақталды');
  redirect(req, res, `/admin/cafes/${cafe.id}`);
});

router.delete('/:id', (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();
  cafesRepo.remove(cafe.id); // меню, столы и заказы удалятся каскадно
  removeUpload(cafe.cover_url);
  flash(req, 'success', `«${cafe.name}» жойылды`);
  redirect(req, res, '/admin/cafes');
});

/* ---------- Столы (htmx: ответ — обновлённый список столов) ---------- */

function renderTables(res, cafe) {
  res.render('admin/cafes/_tables', { cafe, tables: cafesRepo.tables.list(cafe.id) });
}

router.post('/:id/tables', (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();
  cafesRepo.tables.addNext(cafe.id, String(req.body.label ?? '').trim().slice(0, 40) || null);
  renderTables(res, cafe);
});

router.delete('/:id/tables/:tableId', (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();
  cafesRepo.tables.remove(cafe.id, toId(req.params.tableId));
  renderTables(res, cafe);
});

/* ---------- QR-коды ---------- */

/** Скачать QR-код одного стола: /admin/cafes/1/tables/3/qr.svg */
router.get('/:id/tables/:tableId/qr.svg', async (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  const table = cafe && cafesRepo.tables.findById(cafe.id, toId(req.params.tableId));
  if (!table) return next();

  res
    .type('image/svg+xml')
    .attachment(`qrdine-${cafe.slug}-table-${table.number}.svg`)
    .send(await qrSvg(tableUrl(cafe, table)));
});

/** Страница для печати всех QR-кодов (карточки-тейбл-тенты). */
router.get('/:id/qr-print', async (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.params.id));
  if (!cafe) return next();

  const tables = await Promise.all(
    cafesRepo.tables.list(cafe.id).map(async (table) => ({
      ...table,
      url: tableUrl(cafe, table),
      svg: await qrSvg(tableUrl(cafe, table)),
    })),
  );
  res.render('admin/cafes/qr-print', { title: `${cafe.name} — QR-кодтар`, cafe, tables });
});

export default router;
