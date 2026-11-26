/**
 * Маршруты входа и регистрации через Google.
 *
 *   GET /auth/google           → перенаправляет на страницу выбора аккаунта Google
 *   GET /auth/google/callback  → Google возвращает пользователя сюда
 *
 * Логика сопоставления аккаунтов:
 *   1. есть пользователь с этим google_id      → входим;
 *   2. есть пользователь с тем же email         → привязываем Google и входим
 *      (безопасно: принимаются только email, подтверждённые Google);
 *   3. иначе                                    → создаём нового пользователя (регистрация).
 */
import { Router } from 'express';
import { config } from '#src/config/env.js';
import { flash, safeNextUrl } from '#src/lib/http.js';
import { usersRepo } from './users.repository.js';
import { signIn } from './session.js';
import { createAuthRequest, exchangeCode, fetchProfile, GoogleAuthError } from './google.service.js';

const router = Router();

/** Google-вход отключён (нет ключей в .env) — показываем 404. */
router.use('/auth/google', (req, res, next) => (config.google.enabled ? next() : next('router')));

router.get('/auth/google', (req, res) => {
  const { url, state, codeVerifier } = createAuthRequest();
  req.session.googleAuth = { state, codeVerifier, next: safeNextUrl(req.query.next, '') };
  // Сохраняем сессию до редиректа, чтобы state точно был записан
  req.session.save(() => res.redirect(302, url));
});

/** Находит или создаёт пользователя по профилю Google. Экспортируется для тестов. */
export function findOrCreateUser(profile) {
  const byGoogle = usersRepo.findByGoogleId(profile.googleId);
  if (byGoogle) {
    usersRepo.linkGoogle(byGoogle.id, profile.googleId, profile.avatarUrl); // обновляем фото
    return { user: byGoogle, isNew: false };
  }

  const byEmail = usersRepo.findByEmail(profile.email);
  if (byEmail) {
    usersRepo.linkGoogle(byEmail.id, profile.googleId, profile.avatarUrl);
    return { user: byEmail, isNew: false };
  }

  const id = usersRepo.createFromGoogle(profile);
  return { user: usersRepo.findById(id), isNew: true };
}

router.get('/auth/google/callback', async (req, res) => {
  const saved = req.session.googleAuth;
  delete req.session.googleAuth; // state одноразовый

  const fail = (message) => {
    flash(req, 'error', message);
    res.redirect(303, '/login');
  };

  // Пользователь нажал «Отмена» на странице Google
  if (req.query.error) return fail('Google арқылы кіруден бас тартылды');

  // state должен совпасть с сохранённым — иначе это подделанный запрос
  if (!saved || typeof req.query.code !== 'string' || req.query.state !== saved.state) {
    return fail('Кіру сессиясы ескірді. Қайталап көріңіз.');
  }

  try {
    const accessToken = await exchangeCode(req.query.code, saved.codeVerifier);
    const profile = await fetchProfile(accessToken);
    const { user, isNew } = findOrCreateUser(profile);

    await signIn(req, user.id);
    flash(req, 'success', isNew ? `Тіркелу сәтті аяқталды, ${user.name}!` : `Қош келдіңіз, ${user.name}!`);
    res.redirect(303, saved.next || (user.role === 'admin' ? '/admin' : '/account'));
  } catch (error) {
    // Ошибки Google или сети не должны давать страницу 500 — возвращаем на вход
    console.error('[google-auth]', error instanceof GoogleAuthError ? error.message : error);
    fail('Google арқылы кіру мүмкін болмады. Қайталап көріңіз.');
  }
});

export default router;
