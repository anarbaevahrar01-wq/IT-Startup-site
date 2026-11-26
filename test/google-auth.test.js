/**
 * Тесты сопоставления Google-профиля с пользователями.
 * Запуск: npm test (использует временную базу, рабочая не затрагивается).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.DATABASE_PATH = path.join(os.tmpdir(), `qrdine-test-${process.pid}.db`);

const { usersRepo } = await import('../src/modules/auth/users.repository.js');
const { findOrCreateUser } = await import('../src/modules/auth/google.routes.js');
const { verifyPassword } = await import('../src/lib/password.js');

const profile = { googleId: 'g-1', email: 'guest@gmail.com', name: 'Guest', avatarUrl: 'https://lh3.googleusercontent.com/a' };

test('новый профиль Google создаёт пользователя без пароля', async () => {
  const { user, isNew } = findOrCreateUser(profile);
  assert.equal(isNew, true);
  assert.equal(user.email, 'guest@gmail.com');
  assert.equal(user.avatar_url, profile.avatarUrl);
  const stored = usersRepo.findByEmailWithPassword('guest@gmail.com');
  assert.equal(await verifyPassword('', stored.password_hash), false);
});

test('повторный вход находит того же пользователя по google_id', () => {
  const first = usersRepo.findByGoogleId('g-1');
  const { user, isNew } = findOrCreateUser({ ...profile, email: 'changed@gmail.com' });
  assert.equal(isNew, false);
  assert.equal(user.id, first.id);
});

test('существующий email привязывается к Google, а не дублируется', () => {
  const id = usersRepo.create({ name: 'Ahrar', email: 'ahrar@gmail.com', passwordHash: 'scrypt$00$00' });
  const { user, isNew } = findOrCreateUser({ googleId: 'g-2', email: 'ahrar@gmail.com', name: 'Ahrar G', avatarUrl: null });
  assert.equal(isNew, false);
  assert.equal(user.id, id);
  assert.equal(usersRepo.findByGoogleId('g-2').id, id);
});
