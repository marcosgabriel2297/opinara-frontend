import { isApiError } from '@/lib/http';

/** Errores para los que reintentar no sirve: hay que rehacer la conexión con Google. */
const NEEDS_RECONNECT = new Set([
  'GOOGLE_CONNECTION_REVOKED',
  'GOOGLE_CONNECTION_NOT_FOUND',
  'GOOGLE_MISSING_REFRESH_TOKEN',
]);

export function needsGoogleReconnect(error: unknown): boolean {
  return isApiError(error) && NEEDS_RECONNECT.has(error.errorCode);
}
