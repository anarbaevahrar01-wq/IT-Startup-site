/**
 * Подключение к базе данных SQLite.
 *
 * Используется встроенный модуль Node.js `node:sqlite` — без нативных
 * зависимостей и компиляции. API синхронный, что для SQLite нормально:
 * запросы выполняются за микросекунды.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '#src/config/env.js';
import { runMigrations } from './migrate.js';

fs.mkdirSync(path.dirname(config.paths.database), { recursive: true });

export const db = new DatabaseSync(config.paths.database);

// WAL — параллельное чтение во время записи; foreign_keys — каскадные удаления.
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

runMigrations(db);

/**
 * Выполняет функцию внутри транзакции.
 * Если функция бросит ошибку — все изменения будут откатены.
 */
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
