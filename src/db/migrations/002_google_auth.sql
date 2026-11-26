-- ============================================================
--  Вход через Google (OAuth 2.0 / OpenID Connect)
--  google_id  — постоянный идентификатор пользователя Google (поле `sub`)
--  avatar_url — фото профиля Google
--  У пользователей, зарегистрированных только через Google, в password_hash
--  хранится '!' — такой хеш никогда не совпадёт, вход по паролю невозможен.
-- ============================================================

ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
