/**
 * Полностью пересоздаёт базу данных и заполняет её демо-данными.
 * ВНИМАНИЕ: все заказы, пользователи и изменения меню будут удалены.
 *
 * Запуск: npm run db:reset
 */
import fs from 'node:fs';
import { config } from '../src/config/env.js';

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(config.paths.database + suffix, { force: true });
}
console.log('[db] старая база удалена');

// Импорт после удаления: при подключении применятся миграции к новой базе.
const { seedIfEmpty } = await import('../src/db/seed.js');
await seedIfEmpty();
console.log('[db] готово');
