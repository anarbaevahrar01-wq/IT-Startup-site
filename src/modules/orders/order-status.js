/**
 * Статусы заказа — единый справочник для сервера и шаблонов.
 * Порядок важен: по нему строится шкала прогресса на странице заказа.
 */
export const ORDER_STATUSES = Object.freeze({
  new: { label: 'Жаңа', hint: 'Тапсырыс қабылданды', icon: 'bell' },
  preparing: { label: 'Дайындалуда', hint: 'Аспазшы дайындап жатыр', icon: 'flame' },
  ready: { label: 'Дайын', hint: 'Тапсырыс дайын, жақында әкеледі', icon: 'check' },
  completed: { label: 'Аяқталды', hint: 'Ас болсын!', icon: 'check-circle' },
  cancelled: { label: 'Бас тартылды', hint: 'Тапсырыстан бас тартылды', icon: 'x' },
});

export const STATUS_KEYS = Object.keys(ORDER_STATUSES);

/** Статусы, которые отображаются на шкале прогресса (без «отменён»). */
export const PROGRESS_STEPS = ['new', 'preparing', 'ready', 'completed'];

/** Заказ ещё «в работе» — страница гостя продолжает опрашивать сервер. */
export const isActiveStatus = (status) => ['new', 'preparing', 'ready'].includes(status);

export const APPLICATION_STATUSES = Object.freeze({
  new: { label: 'Жаңа' },
  in_progress: { label: 'Өңделуде' },
  done: { label: 'Аяқталды' },
});
