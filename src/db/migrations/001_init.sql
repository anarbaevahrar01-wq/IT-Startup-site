-- ============================================================
--  QR DINE — начальная схема базы данных
--  Время хранится в UTC в формате 'YYYY-MM-DD HH:MM:SS'.
--  Деньги — целые тенге (INTEGER), без копеек.
-- ============================================================

-- Пользователи: гости (customer) и администраторы (admin)
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Заведения-партнёры
CREATE TABLE cafes (
  id          INTEGER PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,          -- часть URL: /cafes/volidam
  name        TEXT    NOT NULL,
  tagline     TEXT,                             -- короткое описание («Шығыс асханасы»)
  description TEXT,
  address     TEXT,
  hours       TEXT,                             -- «11:00–00:00»
  phone       TEXT,
  instagram   TEXT,                             -- логин без @
  cover_url   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Столы / кабинки. На каждый стол печатается свой QR-код.
CREATE TABLE dining_tables (
  id      INTEGER PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  number  INTEGER NOT NULL,
  label   TEXT,                                 -- «VIP кабинка», «Терраса» …
  UNIQUE (cafe_id, number)
);

-- Категории меню (у каждого кафе свои)
CREATE TABLE categories (
  id       INTEGER PRIMARY KEY,
  cafe_id  INTEGER NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  name     TEXT    NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Блюда и напитки
CREATE TABLE menu_items (
  id           INTEGER PRIMARY KEY,
  cafe_id      INTEGER NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  category_id  INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  name         TEXT    NOT NULL,
  description  TEXT,
  price        INTEGER NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Заказы. `code` — публичный номер для гостя (не угадывается перебором).
CREATE TABLE orders (
  id            INTEGER PRIMARY KEY,
  code          TEXT    NOT NULL UNIQUE,
  cafe_id       INTEGER NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  table_id      INTEGER REFERENCES dining_tables (id) ON DELETE SET NULL,
  user_id       INTEGER REFERENCES users (id) ON DELETE SET NULL,
  customer_name TEXT    NOT NULL,
  phone         TEXT,
  comment       TEXT,
  status        TEXT    NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  total         INTEGER NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Позиции заказа. Название и цена копируются, чтобы история
-- не менялась при редактировании меню.
CREATE TABLE order_items (
  id           INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items (id) ON DELETE SET NULL,
  name         TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

-- Заявки от кафе, которые хотят подключиться к QR DINE
CREATE TABLE applications (
  id           INTEGER PRIMARY KEY,
  cafe_name    TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Сессии пользователей (express-session)
CREATE TABLE sessions (
  sid        TEXT    PRIMARY KEY,
  data       TEXT    NOT NULL,
  expires_at INTEGER NOT NULL                   -- unix-время в миллисекундах
);

CREATE INDEX idx_menu_items_cafe ON menu_items (cafe_id, category_id);
CREATE INDEX idx_orders_cafe_status ON orders (cafe_id, status);
CREATE INDEX idx_orders_created ON orders (created_at);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
