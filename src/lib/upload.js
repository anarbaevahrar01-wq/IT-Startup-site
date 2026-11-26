/**
 * Загрузка изображений (фото блюд, обложки кафе) через multer.
 * Файлы сохраняются в storage/uploads и раздаются по адресу /uploads/<имя>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '#src/config/env.js';

fs.mkdirSync(config.paths.uploads, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: config.paths.uploads,
  // Случайное имя: исключает конфликты и подстановку путей вида ../../
  filename: (_req, file, done) => done(null, `${randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
});

const multerSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (ALLOWED_TYPES[file.mimetype]) return done(null, true);
    done(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  },
}).single('image');

/**
 * Middleware: принимает один файл из поля формы `image` (до 5 МБ).
 * Ошибку загрузки не превращает в 500, а кладёт в `req.uploadError`,
 * чтобы контроллер показал её рядом с полем формы.
 */
export function uploadImage(req, res, next) {
  multerSingle(req, res, (error) => {
    if (error) {
      req.uploadError =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Файл 5 МБ-тан аспауы керек'
          : 'Тек JPG, PNG, WEBP немесе AVIF суреттері қабылданады';
    }
    next();
  });
}

/** Публичный URL загруженного файла. */
export const uploadedUrl = (file) => (file ? `/uploads/${file.filename}` : null);

/** Удаляет ранее загруженный файл (картинки из /img/ — встроенные, их не трогаем). */
export function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  const file = path.join(config.paths.uploads, path.basename(url));
  fs.rm(file, { force: true }, () => {});
}
