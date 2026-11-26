/**
 * Вход через Google: OAuth 2.0 Authorization Code Flow + PKCE.
 *
 * Как это работает:
 *  1. createAuthRequest() — генерирует state (защита от CSRF) и code_verifier (PKCE),
 *     возвращает адрес страницы согласия Google. Значения сохраняются в сессии.
 *  2. Google возвращает пользователя на /auth/google/callback?code=…&state=…
 *  3. exchangeCode() — сервер меняет одноразовый code на access_token
 *     (запрос идёт напрямую к Google по HTTPS вместе с client_secret).
 *  4. fetchProfile() — по access_token получаем профиль: id, email, имя, фото.
 *
 * Внешние библиотеки не нужны — хватает встроенных fetch и crypto.
 */
import { randomBytes, createHash } from 'node:crypto';
import { config } from '#src/config/env.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Адрес, на который Google вернёт пользователя. Должен быть добавлен в Google Cloud Console. */
export const redirectUri = () => `${config.baseUrl}/auth/google/callback`;

const base64url = (buffer) => buffer.toString('base64url');

export class GoogleAuthError extends Error {}

/**
 * Готовит запрос авторизации.
 * @returns {{ url: string, state: string, codeVerifier: string }}
 */
export function createAuthRequest() {
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(48));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account', // всегда показывать выбор аккаунта
  });

  return { url: `${AUTH_URL}?${params}`, state, codeVerifier };
}

/** Обменивает одноразовый code на access_token. */
export async function exchangeCode(code, codeVerifier) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new GoogleAuthError(`Google token error: ${data.error ?? response.status}`);
  }
  return data.access_token;
}

/**
 * Профиль пользователя Google.
 * @returns {Promise<{ googleId: string, email: string, name: string, avatarUrl: string|null }>}
 */
export async function fetchProfile(accessToken) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const profile = await response.json().catch(() => ({}));

  if (!response.ok || !profile.sub || !profile.email) {
    throw new GoogleAuthError(`Google userinfo error: ${response.status}`);
  }
  // Привязываем аккаунты по email, поэтому принимаем только подтверждённые адреса
  if (profile.email_verified !== true) {
    throw new GoogleAuthError('Google email не подтверждён');
  }

  return {
    googleId: String(profile.sub),
    email: String(profile.email).toLowerCase(),
    name: String(profile.name || profile.email.split('@')[0]).slice(0, 60),
    avatarUrl: profile.picture ?? null,
  };
}
