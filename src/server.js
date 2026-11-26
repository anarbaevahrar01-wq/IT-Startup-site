/**
 * Точка входа: заполняет базу начальными данными (если пусто)
 * и запускает HTTP-сервер.
 */
import { config } from '#src/config/env.js';
import { seedIfEmpty } from '#src/db/seed.js';
import { createApp } from '#src/app.js';

await seedIfEmpty();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`\n  QR DINE запущен: ${config.baseUrl}`);
  console.log(`  Админ-панель:    ${config.baseUrl}/admin\n`);
});

// Корректное завершение (Ctrl+C, остановка контейнера)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
