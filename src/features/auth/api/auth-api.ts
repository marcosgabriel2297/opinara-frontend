import { api, request, session } from '@/lib/http';

import { sessionSchema, type SessionResponse } from './schemas';
import { type LoginValues } from './validation';

export function login(values: LoginValues): Promise<SessionResponse> {
  return api.post('/auth/login', { auth: false, body: values, schema: sessionSchema });
}

/**
 * Canjea el refresh token persistido por una sesión nueva. Es lo único que corre al abrir la app:
 * `refresh` devuelve también el usuario, así que no hace falta un `GET /auth/me` extra.
 */
export function resumeSession(refreshToken: string): Promise<SessionResponse> {
  return api.post('/auth/refresh', { auth: false, body: { refreshToken }, schema: sessionSchema });
}

/** Persiste los tokens que devolvió `login` o `refresh`. */
export function persistSession(response: SessionResponse): void {
  session.set({ accessToken: response.accessToken, refreshToken: response.refreshToken });
}

/**
 * Revoca la sesión en el backend: el refresh token deja de servir aunque alguien lo haya copiado.
 * Sin access token (puede estar vencido): alcanza con el refresh.
 */
export function logout(refreshToken: string): Promise<void> {
  return request('/auth/logout', { method: 'POST', auth: false, body: { refreshToken } });
}

/** Cierra todas las sesiones del usuario, también la de este dispositivo. */
export function logoutEverywhere(): Promise<void> {
  return request('/auth/logout/all', { method: 'POST' });
}

/** Siempre responde igual, exista o no la cuenta. */
export function forgotPassword(email: string): Promise<void> {
  return request('/auth/password/forgot', { method: 'POST', auth: false, body: { email } });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return request('/auth/password/reset', { method: 'POST', auth: false, body: { token, password } });
}

/** Cambia la contraseña conociendo la actual (la provisoria del alta). Cierra las demás sesiones. */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request('/auth/password/change', { method: 'POST', body: { currentPassword, newPassword } });
}
