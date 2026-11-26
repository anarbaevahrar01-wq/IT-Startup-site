/**
 * Конфигурация приложения.
 *
 * Все переменные окружения читаются ТОЛЬКО здесь. Остальной код импортирует
 * готовый объект `config` — так легко увидеть, чем управляется приложение.
 */
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '../..');
const env = process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';
const port = Number(process.env.PORT ?? 3000);

/** Возвращает переменную окружения или бросает ошибку в production. */
function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Переменная окружения ${name} обязательна в production`);
  return devFallback;
}

const storageDir = path.join(rootDir, 'storage');

export const config = Object.freeze({
  env,
  isProd,
  port,
  baseUrl: (process.env.BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
  sessionSecret: required('SESSION_SECRET', 'dev-only-secret-do-not-use-in-production'),
  tzOffsetHours: Number(process.env.TZ_OFFSET_HOURS ?? 5),

  paths: {
    root: rootDir,
    views: path.join(rootDir, 'views'),
    public: path.join(rootDir, 'public'),
    nodeModules: path.join(rootDir, 'node_modules'),
    storage: storageDir,
    uploads: path.join(storageDir, 'uploads'),
    database: process.env.DATABASE_PATH ?? path.join(storageDir, 'qrdine.db'),
  },

  /**
   * Вход через Google. Если ключи не заданы — кнопка «Войти через Google»
   * просто не показывается, остальной сайт работает как обычно.
   */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    get enabled() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },

  admin: {
    name: process.env.ADMIN_NAME ?? 'Әкімші',
    email: process.env.ADMIN_EMAIL ?? 'admin@qrdine.kz',
    password: required('ADMIN_PASSWORD', 'admin12345'),
  },
});
