/**
 * Форматирование данных для отображения (деньги, даты).
 * Функции регистрируются как фильтры Nunjucks в src/app.js.
 */

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 1700 → «1 700 ₸» */
export function formatMoney(value) {
  return `${moneyFormatter.format(Number(value) || 0)} ₸`;
}

/** SQLite хранит UTC как «YYYY-MM-DD HH:MM:SS» — превращаем в Date. */
export function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(`${String(value).replace(' ', 'T')}Z`);
}

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Almaty',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Almaty',
  hour: '2-digit',
  minute: '2-digit',
});

/** «26.11.2026, 14:05» */
export function formatDateTime(value) {
  const date = parseDbDate(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

/** «14:05» */
export function formatTime(value) {
  const date = parseDbDate(value);
  return date ? timeFormatter.format(date) : '—';
}

/** «5 мин бұрын» — относительное время на казахском */
export function timeAgo(value) {
  const date = parseDbDate(value);
  if (!date) return '—';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'жаңа ғана';
  if (minutes < 60) return `${minutes} мин бұрын`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} сағ бұрын`;
  return formatDateTime(date);
}

/** Инициалы для аватара: «Анарбаев Ахрар» → «АА» */
export function initials(name) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
