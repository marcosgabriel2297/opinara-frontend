import { paths } from '@/app/paths';

/** Dónde manda el guard a quien no tiene sesión. */
export const LOGIN_PATH = paths.login;

/**
 * Lee el destino guardado por el guard. `location.state` es `unknown`, así que se valida
 * en vez de castear: además, un `from` que no sea una ruta interna sería un redirect abierto.
 */
export function redirectTargetFrom(state: unknown): string {
  if (typeof state !== 'object' || state === null) return paths.home;

  const from = (state as { from?: unknown }).from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return paths.home;

  return from;
}

/** El email que trae la navegación (por ejemplo, desde una invitación), para no pedirlo de nuevo. */
export function emailFrom(state: unknown): string {
  if (typeof state !== 'object' || state === null) return '';
  const email = (state as { email?: unknown }).email;
  return typeof email === 'string' ? email : '';
}
