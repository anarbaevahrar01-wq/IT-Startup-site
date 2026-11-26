/**
 * Админка → Меню: категории и позиции выбранного кафе.
 */
import { Router } from 'express';
import { menuRepo } from '#src/modules/menu/menu.repository.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';
import { uploadImage, uploadedUrl, removeUpload } from '#src/lib/upload.js';
import { validate, text, optionalText, int, checkbox, z } from '#src/lib/validation.js';
import { toId, redirect, flash } from '#src/lib/http.js';

const router = Router();

/** Текущее кафе из ?cafe=ID (по умолчанию — первое). */
function currentCafe(req) {
  const cafes = cafesRepo.listAll();
  const id = toId(req.query.cafe ?? req.body?.cafe_id);
  return { cafes, cafe: cafes.find((c) => c.id === id) ?? cafes[0] ?? null };
}

/* ---------- Список ---------- */

router.get('/', (req, res) => {
  const { cafes, cafe } = currentCafe(req);
  res.render('admin/menu/index', {
    title: 'Мәзір',
    section: 'menu',
    cafes,
    cafe,
    categories: cafe ? menuRepo.categories.list(cafe.id) : [],
    items: cafe ? menuRepo.items.listByCafe(cafe.id) : [],
  });
});

/* ---------- Категории (htmx: ответ — обновлённый блок категорий) ---------- */

function renderCategories(res, cafe, error = null) {
  res.render('admin/menu/_categories', { cafe, categories: menuRepo.categories.list(cafe.id), error });
}

router.post('/categories', (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.body.cafe_id));
  if (!cafe) return next();
  const name = String(req.body.name ?? '').trim().slice(0, 60);
  if (!name) return renderCategories(res, cafe, 'Санат атауын енгізіңіз');
  menuRepo.categories.create(cafe.id, name);
  renderCategories(res, cafe);
});

router.delete('/categories/:id', (req, res, next) => {
  const category = menuRepo.categories.findById(toId(req.params.id));
  if (!category) return next();
  menuRepo.categories.remove(category.id); // позиции останутся «без категории»
  renderCategories(res, cafesRepo.findById(category.cafe_id));
});

/* ---------- Позиции меню ---------- */

const itemSchema = z.object({
  cafe_id: int({ min: 1 }),
  category_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => null)),
  name: text(80, { label: 'Атауы', min: 2 }),
  description: optionalText(300),
  price: int({ min: 0, max: 1_000_000, label: 'Бағасы' }),
  is_available: checkbox(),
  remove_image: checkbox(),
});

/** Категория должна принадлежать тому же кафе, иначе — «без категории». */
const ownCategory = (categoryId, cafeId) =>
  categoryId && menuRepo.categories.findById(categoryId)?.cafe_id === cafeId ? categoryId : null;

function renderForm(res, { item, cafe, values, errors, status = 200 }) {
  res.status(status).render('admin/menu/form', {
    title: item ? `${item.name} — өңдеу` : 'Жаңа тағам',
    section: 'menu',
    item,
    cafe,
    categories: menuRepo.categories.list(cafe.id),
    values,
    errors,
  });
}

router.get('/new', (req, res) => {
  const { cafe } = currentCafe(req);
  if (!cafe) return redirect(req, res, '/admin/cafes/new');
  renderForm(res, { item: null, cafe, values: { is_available: true }, errors: null });
});

router.post('/', uploadImage, (req, res, next) => {
  const cafe = cafesRepo.findById(toId(req.body.cafe_id));
  if (!cafe) return next();

  const { data, errors } = validate(itemSchema, req.body);
  if (errors || req.uploadError) {
    removeUpload(uploadedUrl(req.file));
    return renderForm(res, {
      item: null, cafe, values: req.body, status: 422,
      errors: { ...errors, ...(req.uploadError && { image: req.uploadError }) },
    });
  }

  menuRepo.items.create({
    ...data,
    category_id: ownCategory(data.category_id, cafe.id),
    image_url: uploadedUrl(req.file),
  });
  flash(req, 'success', `«${data.name}» мәзірге қосылды`);
  redirect(req, res, `/admin/menu?cafe=${cafe.id}`);
});

router.get('/:id/edit', (req, res, next) => {
  const item = menuRepo.items.findById(toId(req.params.id));
  if (!item) return next();
  renderForm(res, { item, cafe: cafesRepo.findById(item.cafe_id), values: item, errors: null });
});

router.post('/:id', uploadImage, (req, res, next) => {
  const item = menuRepo.items.findById(toId(req.params.id));
  if (!item) return next();
  const cafe = cafesRepo.findById(item.cafe_id);

  const { data, errors } = validate(itemSchema, { ...req.body, cafe_id: item.cafe_id });
  if (errors || req.uploadError) {
    removeUpload(uploadedUrl(req.file));
    return renderForm(res, {
      item, cafe, values: { ...req.body, image_url: item.image_url }, status: 422,
      errors: { ...errors, ...(req.uploadError && { image: req.uploadError }) },
    });
  }

  // Новое фото заменяет старое; галочка «удалить фото» — убирает его
  let imageUrl = item.image_url;
  if (req.file || data.remove_image) {
    removeUpload(item.image_url);
    imageUrl = uploadedUrl(req.file);
  }

  menuRepo.items.update(item.id, {
    ...data,
    category_id: ownCategory(data.category_id, item.cafe_id),
    image_url: imageUrl,
  });
  flash(req, 'success', 'Өзгерістер сақталды');
  redirect(req, res, `/admin/menu?cafe=${item.cafe_id}`);
});

/** Быстро скрыть/показать позицию (переключатель в таблице). */
router.post('/:id/toggle', (req, res, next) => {
  const id = toId(req.params.id);
  if (!menuRepo.items.findById(id)) return next();
  menuRepo.items.toggle(id);
  res.render('admin/menu/_item-row', { item: menuRepo.items.findById(id) });
});

router.delete('/:id', (req, res, next) => {
  const item = menuRepo.items.findById(toId(req.params.id));
  if (!item) return next();
  menuRepo.items.remove(item.id);
  removeUpload(item.image_url);
  res.send(''); // htmx удалит строку таблицы
});

export default router;
