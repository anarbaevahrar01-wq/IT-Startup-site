/**
 * Простейшая система миграций.
 *
 * Каждый файл в папке `migrations/` (001_*.sql, 002_*.sql …) применяется
 * ровно один раз, по порядку. Применённые миграции записываются в таблицу
 * `schema_migrations`. Чтобы изменить схему — добавьте новый файл, а старые
 * не трогайте.
 */
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      db.exec('COMMIT');
      console.log(`[db] миграция применена: ${file}`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Ошибка миграции ${file}: ${error.message}`);
    }
  }
}
