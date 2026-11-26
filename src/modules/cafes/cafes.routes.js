/**
 * Страница кафе с меню + вход по QR-коду стола.
 */
import { Router } from 'express';
import { cafesRepo } from './cafes.repository.js';
import { menuRepo, groupByCategory } from '#src/modules/menu/menu.repository.js';
import { flash } from '#src/lib/http.js';
import { summarizeCart } from '#src/modules/cart/cart.service.js';

const router = Router();

/** Находит активное кафе по slug или отдаёт 404. */
function loadCafe(req, res, next) {
  const cafe = cafesRepo.findBySlug(req.params.slug);
  if (!cafe || !cafe.is_active) return next('route');
  req.cafe = cafe;
  next();
}

/** Стол, выбранный гостем через QR-код (хранится в сессии). */
function selectedTable(req, cafe) {
  const selected = req.session.table;
  return selected?.cafeId === cafe.id ? cafesRepo.tables.findById(cafe.id, selected.tableId) : null;
}

/** Сколько штук каждого блюда уже в корзине — показываем на карточках меню. */
function cartQuantities(req) {
  return req.session.cart?.items ?? {};
}

router.get('/cafes/:slug', loadCafe, (req, res) => {
  const { cafe } = req;
  const categories = menuRepo.categories.list(cafe.id);
  const items = menuRepo.items.searchAvailable(cafe.id);

  res.render('pages/cafe', {
    title: cafe.name,
    description: cafe.tagline,
    cafe,
    categories,
    sections: groupByCategory(items, categories),
    table: selectedTable(req, cafe),
    quantities: cartQuantities(req),
    cart: summarizeCart(req.session),
  });
});

/**
 * Живой поиск по меню (htmx): возвращает только блок с разделами меню.
 * GET /cafes/volidam/menu?q=шашлық
 */
router.get('/cafes/:slug/menu', loadCafe, (req, res) => {
  const { cafe } = req;
  const query = String(req.query.q ?? '');
  const categories = menuRepo.categories.list(cafe.id);
  const items = menuRepo.items.searchAvailable(cafe.id, query);

  res.render('fragments/menu-sections', {
    cafe,
    query,
    sections: groupByCategory(items, categories),
    quantities: cartQuantities(req),
  });
});

/**
 * Адрес, зашитый в QR-код стола: /t/volidam/3
 * Запоминает стол в сессии и открывает меню.
 */
router.get('/t/:slug/:number', loadCafe, (req, res, next) => {
  const table = cafesRepo.tables.findByNumber(req.cafe.id, Number(req.params.number));
  if (!table) return next('route');

  req.session.table = { cafeId: req.cafe.id, tableId: table.id };
  flash(req, 'success', `Қош келдіңіз! Сіз №${table.number} үстелдесіз`);
  res.redirect(303, `/cafes/${req.cafe.slug}`);
});

export default router;
