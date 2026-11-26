/**
 * Начальные данные.
 *
 * seedIfEmpty() вызывается при каждом старте сервера, но ничего не делает,
 * если данные уже есть:
 *  - создаёт администратора из .env (ADMIN_EMAIL / ADMIN_PASSWORD), если админа нет;
 *  - создаёт демо-кафе Volidam с меню и столами, если кафе нет.
 */
import { config } from '#src/config/env.js';
import { db, transaction } from './index.js';
import { hashPassword } from '#src/lib/password.js';
import { usersRepo } from '#src/modules/auth/users.repository.js';
import { cafesRepo } from '#src/modules/cafes/cafes.repository.js';

const VOLIDAM = {
  slug: 'volidam',
  name: 'Volidam',
  tagline: 'Шығыс асханасы • Түркістан',
  description:
    'Шығыс тағамдары, жайлы атмосфера және қонақжайлық. Жеке кабинкалар, халал ас және ' +
    'QR DINE арқылы даяшыны күтпей тапсырыс беру мүмкіндігі.',
  address: 'Түркістан, Қарашық, Тұран №1',
  hours: '11:00–00:00',
  phone: '+7 705 897 66 16',
  instagram: 'volidam_kafe',
  cover_url: '/img/menu/assorti-myasnoy.jpg',
};

// [категория, [название, цена, файл фото, описание?]]
const VOLIDAM_MENU = [
  ['Ассорти', [
    ['Мясной ассорти', 5000, 'assorti-myasnoy.jpg', 'Шашлықтың бірнеше түрі, көкөніс және соус — үлкен компанияға'],
    ['Фруктовое ассорти', 4000, 'assorti-fruktovoe.jpg', 'Маусымдық жемістер табағы'],
    ['Чикен', 2500, 'assorti-chicken.jpg', 'Тауық етінен жасалған ассорти'],
  ]],
  ['Салаттар', [
    ['Острый', 1700, 'salad-ostry.jpg', 'Ащы соусы бар ет салаты'],
    ['Цезарь', 1700, 'salad-caesar.jpg', 'Тауық еті, айсберг, пармезан, кретон'],
    ['Хрустящие баклажаны', 1900, 'salad-baklazhany.jpg', 'Қытырлақ баклажан, тәтті-ащы соус'],
    ['Фруктовый', 1700, 'salad-fruktoviy.jpg', null],
    ['Свежий', 1100, 'salad-svezhiy.jpg', 'Қияр, қызанақ, көк шөп'],
    ['Ачичук', 1100, 'salad-achichuk.jpg', 'Қызанақ пен пияздан жасалған өзбек салаты'],
    ['Мужской каприз', 1700, 'salad-muzhskoy.jpg', 'Сиыр еті, маринадталған пияз, майонез'],
  ]],
  ['Шашлық', [
    ['Кусковой', 700, 'shashlyk-kuskovoy.jpg', 'Кесек еттен, 1 шиш'],
    ['Фарш', 700, 'shashlyk-farsh.jpg', 'Люля-кебаб, 1 шиш'],
    ['Окорочка (крылышки)', 950, 'shashlyk-okorochka.jpg', 'Тауық қанаттары, 1 шиш'],
    ['Кабырга', 3500, 'shashlyk-kabyrga.jpg', 'Қой қабырғасы'],
  ]],
  ['Сусындар', [
    ['Кола 1 л', 700, 'drink-cola-1l.jpg'],
    ['Кола 1,5 л', 850, 'drink-cola-1-5l.jpg'],
    ['Пепси 1 л', 700, 'drink-pepsi-1l.jpg'],
    ['Пепси 1,5 л', 850, 'drink-pepsi-1-5l.jpg'],
    ['Макси чай', 700, 'drink-maxi-tea.jpg'],
    ['Спрайт', 700, 'drink-sprite.jpg'],
    ['Фанта', 700, 'drink-fanta.jpg'],
    ['Пико морс', 850, 'drink-piko.jpg'],
    ['Фьюсти чай', 700, 'drink-fuzetea.jpg'],
    ['Мохито (құмыра)', 1800, 'drink-mojito.jpg'],
    ['Көк шай', 350, 'drink-green-tea.jpg'],
    ['Қара шай', 350, 'drink-black-tea.jpg'],
    ['Ташкент шайы', 450, 'drink-tashkent-tea.jpg'],
    ['Кофе', 150, 'drink-coffee.jpg'],
    ['DIZZY', 450, 'drink-dizzy.jpg'],
    ['GORILLA', 450, 'drink-gorilla.jpg'],
  ]],
];

async function ensureAdmin() {
  if (usersRepo.countAdmins() > 0) return;
  usersRepo.create({
    name: config.admin.name,
    email: config.admin.email.toLowerCase(),
    passwordHash: await hashPassword(config.admin.password),
    role: 'admin',
  });
  console.log(`[seed] создан администратор ${config.admin.email}`);
}

function ensureDemoCafe() {
  if (cafesRepo.listAll().length > 0) return;

  transaction(() => {
    const cafeId = cafesRepo.create(VOLIDAM);
    for (let i = 0; i < 6; i++) cafesRepo.tables.addNext(cafeId, i < 2 ? 'VIP кабинка' : null);

    const insertCategory = db.prepare('INSERT INTO categories (cafe_id, name, position) VALUES (?, ?, ?)');
    const insertItem = db.prepare(`
      INSERT INTO menu_items (cafe_id, category_id, name, description, price, image_url, position)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);

    VOLIDAM_MENU.forEach(([category, items], categoryIndex) => {
      const categoryId = Number(insertCategory.run(cafeId, category, categoryIndex).lastInsertRowid);
      items.forEach(([name, price, image, description = null], position) => {
        insertItem.run(cafeId, categoryId, name, description, price, `/img/menu/${image}`, position);
      });
    });
  });
  console.log('[seed] создано демо-кафе Volidam (30 позиций, 6 столов)');
}

export async function seedIfEmpty() {
  await ensureAdmin();
  ensureDemoCafe();
}
