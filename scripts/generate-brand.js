/**
 * Генерирует фирменные файлы из src/lib/brand.js:
 *
 *   public/img/brand/logo.svg            — логотип со слоганом (светлый фон)
 *   public/img/brand/logo-dark.svg       — логотип со слоганом (тёмный фон)
 *   public/img/brand/logo-compact.svg    — логотип без слогана
 *   public/img/brand/mark.svg            — только знак
 *   public/favicon.svg                   — фавикон
 *   public/icons/*.png                   — PNG-иконки (PWA, iOS, соцсети)
 *
 * Запуск: npm run brand
 */
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { logoSvg, markSvg, appIconSvg, PALETTES, BRAND_COLORS } from '../src/lib/brand.js';

const root = path.resolve(import.meta.dirname, '..');
const brandDir = path.join(root, 'public/img/brand');
const iconsDir = path.join(root, 'public/icons');
fs.mkdirSync(brandDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });

const write = (file, content) => {
  fs.writeFileSync(file, content);
  console.log('✓', path.relative(root, file));
};

/** Растеризует SVG в PNG заданной ширины. */
const toPng = (svg, width, file) => {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  }).render().asPng();
  write(file, png);
};

// --- SVG ---
const logo = logoSvg({ tagline: true, colors: PALETTES.light });
write(path.join(brandDir, 'logo.svg'), logo);
write(path.join(brandDir, 'logo-dark.svg'), logoSvg({ tagline: true, colors: PALETTES.dark }));
write(path.join(brandDir, 'logo-compact.svg'), logoSvg({ colors: PALETTES.light }));
write(path.join(brandDir, 'mark.svg'), markSvg());
write(path.join(root, 'public/favicon.svg'), appIconSvg());

// --- PNG-иконки ---
const icon = appIconSvg();
const maskable = appIconSvg({ maskable: true });
toPng(icon, 32, path.join(iconsDir, 'favicon-32.png'));
toPng(icon, 180, path.join(iconsDir, 'apple-touch-icon.png'));
toPng(icon, 192, path.join(iconsDir, 'icon-192.png'));
toPng(icon, 512, path.join(iconsDir, 'icon-512.png'));
toPng(maskable, 512, path.join(iconsDir, 'icon-maskable-512.png'));

// --- Картинка для соцсетей (Open Graph 1200×630) ---
const inner = logo.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const ogImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BRAND_COLORS.cream}"/>
  <rect y="582" width="1200" height="48" fill="${BRAND_COLORS.ink}"/>
  <g transform="translate(244 210)">${inner}</g>
</svg>`;
toPng(ogImage, 1200, path.join(iconsDir, 'og-image.png'));
