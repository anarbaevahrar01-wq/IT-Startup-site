/**
 * Логотип QR DINE в виде векторной графики.
 *
 * Единственный источник правды для фирменного знака:
 *  - на сайте логотип вставляется инлайном (цвета через CSS-переменные);
 *  - скрипт `npm run brand` генерирует из этих же функций файлы
 *    public/img/brand/*.svg и PNG-иконки.
 *
 * Знак состоит из: оранжевых «уголков сканера», QR-модулей и белой
 * «тарелки» с вилкой и ножом в центре. Буквы словесного знака нарисованы
 * контурами (без шрифта), поэтому выглядят одинаково везде.
 */

export const BRAND_COLORS = Object.freeze({
  ink: '#0A3A2D',     // тёмно-зелёный
  accent: '#F4A30B',  // янтарный
  paper: '#FFFFFF',
  cream: '#FBF8F1',
});

/* ---------- Знак (сетка 120×120) ---------- */

// QR-область начинается с 22 px, один модуль = 4 px, всего 19×19 модулей.
const QR_ORIGIN = 22;
const MODULE = 4;

// «Данные» QR-кода — [колонка, строка]. Подобраны вручную, чтобы знак
// выглядел как настоящий QR и не перекрывался тарелкой с приборами.
const DATA_MODULES = [
  [8, 0], [10, 0], [9, 1], [8, 2], [10, 2], [9, 3], [8, 4], [10, 4],
  [0, 8], [2, 8], [4, 8], [1, 9], [3, 9], [5, 9], [0, 10], [2, 10], [4, 10],
  [13, 8], [15, 8], [17, 8], [14, 9], [16, 9], [18, 9], [13, 10], [15, 10], [17, 10], [14, 11], [18, 11],
  [13, 13], [14, 13], [16, 13], [18, 13], [15, 14], [17, 14], [13, 15], [16, 15], [18, 15],
  [14, 16], [15, 16], [17, 16], [13, 17], [16, 17], [18, 17], [14, 18], [15, 18], [17, 18], [18, 18],
  [8, 18], [9, 18], [11, 18],
];

/** Квадрат-«глазок» QR-кода 7×7 модулей: рамка + центр. */
function finder(x, y) {
  return `M${x} ${y}h28v28h-28z M${x + 4} ${y + 4}v20h20v-20z M${x + 8} ${y + 8}h12v12h-12z`;
}

const QR_PATH = [
  finder(22, 22),
  finder(70, 22),
  finder(22, 70),
  ...DATA_MODULES.map(([c, r]) => `M${QR_ORIGIN + c * MODULE} ${QR_ORIGIN + r * MODULE}h4v4h-4z`),
].join(' ');

// Уголки сканера (рисуются линией с закруглёнными концами)
const BRACKETS_PATH =
  'M8 31V20A12 12 0 0 1 20 8H31 M89 8H100A12 12 0 0 1 112 20V31 ' +
  'M8 89V100A12 12 0 0 0 20 112H31 M89 112H100A12 12 0 0 0 112 100V89';

// Вилка и нож
const UTENSILS = `
  <rect x="49.5" y="45" width="2.2" height="13" rx="1.1"/>
  <rect x="53.4" y="45" width="2.2" height="13" rx="1.1"/>
  <rect x="57.3" y="45" width="2.2" height="13" rx="1.1"/>
  <path d="M49.5 56H59.5V58A5 5 0 0 1 49.5 58Z"/>
  <rect x="52.5" y="60" width="4" height="26" rx="2"/>
  <path d="M63 45C69.5 46.5 71 55 70.5 65H67V84A2 2 0 0 1 63 84Z"/>`;

/**
 * Возвращает содержимое знака (без обёртки <svg>) в координатах 120×120.
 * @param {{ink:string, accent:string, plate:string, utensils:string}} c — цвета
 */
export function markShapes(c) {
  return `
  <path d="${BRACKETS_PATH}" fill="none" stroke="${c.accent}" stroke-width="7" stroke-linecap="round"/>
  <path d="${QR_PATH}" fill="${c.ink}" fill-rule="evenodd"/>
  <rect x="45" y="40" width="30" height="52" rx="7" fill="${c.plate}"/>
  <g fill="${c.utensils}">${UTENSILS}</g>`;
}

/* ---------- Словесный знак «QRDINE» (высота букв 100, ширина 524) ---------- */

export function wordmarkShapes(c) {
  return `
  <g fill="${c.ink}">
    <path fill-rule="evenodd" d="M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z M50 26A24 24 0 1 0 50 74A24 24 0 1 0 50 26Z"/>
    <path d="M54 66L70 50L108 96L92 112Z"/>
    <g transform="translate(116 0)">
      <path d="M0 0H25V100H0Z"/>
      <path fill-rule="evenodd" d="M25 0H50A31 31 0 0 1 50 62H25Z M25 22H48A9 9 0 0 1 48 40H25Z"/>
      <path d="M30 56H58L84 100H56Z"/>
    </g>
  </g>
  <g fill="${c.accent}">
    <path transform="translate(210 0)" fill-rule="evenodd" d="M0 0H42A50 50 0 0 1 42 100H0Z M25 24H40A26 26 0 0 1 40 76H25Z"/>
    <path transform="translate(312 0)" d="M0 0H25V100H0Z"/>
    <path transform="translate(347 0)" d="M0 0H25V100H0Z M66 0H91V100H66Z M0 0H27L91 100H64Z"/>
    <path transform="translate(448 0)" d="M0 0H74V22H25V39H68V61H25V78H76V100H0Z"/>
  </g>`;
}

/* ---------- Готовые варианты ---------- */

/** Цвета для инлайн-логотипа на сайте — настраиваются через CSS. */
export const CSS_VAR_COLORS = Object.freeze({
  ink: 'var(--logo-ink, #0A3A2D)',
  accent: 'var(--logo-accent, #F4A30B)',
  plate: 'var(--logo-plate, #FFFFFF)',
  utensils: 'var(--logo-utensils, #0A3A2D)',
});

/** Цвета для светлого фона и для тёмного фона. */
export const PALETTES = Object.freeze({
  light: { ink: BRAND_COLORS.ink, accent: BRAND_COLORS.accent, plate: BRAND_COLORS.paper, utensils: BRAND_COLORS.ink },
  dark: { ink: BRAND_COLORS.cream, accent: BRAND_COLORS.accent, plate: BRAND_COLORS.cream, utensils: BRAND_COLORS.ink },
});

const TAGLINE_FONT = "'Montserrat Variable', Montserrat, 'Segoe UI', Arial, sans-serif";

/**
 * Полный логотип: знак + «QRDINE» (+ слоган «SCAN • ORDER • ENJOY»).
 * @param {object} options
 * @param {boolean} [options.tagline=false] — показывать ли слоган
 * @param {object}  [options.colors] — палитра (по умолчанию CSS-переменные)
 * @param {string}  [options.className]
 */
export function logoSvg({ tagline = false, colors = CSS_VAR_COLORS, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  if (!tagline) {
    return `<svg${classAttr} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 676 122" role="img" aria-label="QR DINE">
  <g transform="translate(0 1)">${markShapes(colors)}</g>
  <g transform="translate(150 10)">${wordmarkShapes(colors)}</g>
</svg>`;
  }

  return `<svg${classAttr} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 712 162" role="img" aria-label="QR DINE — Scan • Order • Enjoy">
  <g transform="translate(0 3) scale(1.3)">${markShapes(colors)}</g>
  <g transform="translate(186 6) scale(0.98)">${wordmarkShapes(colors)}</g>
  <g font-family="${TAGLINE_FONT}" font-size="25" font-weight="700" letter-spacing="8" fill="${colors.ink}">
    <text x="190" y="154">SCAN</text>
    <text x="336" y="154" text-anchor="middle" fill="${colors.accent}">•</text>
    <text x="452" y="154" text-anchor="middle">ORDER</text>
    <text x="566" y="154" text-anchor="middle" fill="${colors.accent}">•</text>
    <text x="715" y="154" text-anchor="end">ENJOY</text>
  </g>
</svg>`;
}

/** Только знак (квадрат). */
export function markSvg({ colors = PALETTES.light } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="QR DINE">${markShapes(colors)}
</svg>`;
}

/**
 * Иконка приложения / фавикон: тёмно-зелёная плашка, янтарные уголки
 * и крупные приборы — читается даже в размере 16×16.
 * @param {{ maskable?: boolean }} options — maskable: без скруглений и с полями (для Android)
 */
export function appIconSvg({ maskable = false } = {}) {
  const { ink, accent, cream } = BRAND_COLORS;
  const radius = maskable ? 0 : 28;
  const scale = maskable ? 0.62 : 0.8;
  const offset = (120 - 120 * scale) / 2;
  const utensilScale = maskable ? 1.25 : 1.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="${radius}" fill="${ink}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${BRACKETS_PATH}" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>
  </g>
  <g fill="${cream}" transform="translate(60 60) scale(${utensilScale}) translate(-60 -65.5)">${UTENSILS}</g>
</svg>`;
}
