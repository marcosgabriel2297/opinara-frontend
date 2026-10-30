/**
 * Almacen de la sesion.
 *
 * Decision (y tradeoff conocido): el access token vive **solo en memoria**, asi que una pestaña
 * nueva arranca sin el y lo recupera con un refresh. El refresh token va a `localStorage` porque
 * el backend lo devuelve en el body y no hay otro lugar donde persistirlo desde JS; eso lo expone
 * a XSS. La alternativa real es una cookie `httpOnly` emitida por el backend, que es un cambio de
 * backend. Ver la nota en README.
 */

const REFRESH_TOKEN_KEY = 'opinara.refresh-token';

export interface SessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
}

type Listener = (snapshot: SessionSnapshot) => void;

let accessToken: string | null = null;
let refreshToken: string | null = readStoredRefreshToken();
let snapshot: SessionSnapshot = { accessToken, refreshToken };

const listeners = new Set<Listener>();

function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // localStorage puede tirar en modo privado o con cookies bloqueadas.
    return null;
  }
}

function writeStoredRefreshToken(token: string | null): void {
  try {
    if (token === null) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  } catch {
    // Sin persistencia la sesion dura lo que dura la pestaña. Es degradado, no roto.
  }
}

function emit(): void {
  snapshot = { accessToken, refreshToken };
  for (const listener of listeners) listener(snapshot);
}

export const session = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => refreshToken,

  /** Referencia estable mientras no cambie nada: sirve para `useSyncExternalStore`. */
  getSnapshot: (): SessionSnapshot => snapshot,

  set: (tokens: { accessToken: string; refreshToken: string }): void => {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    writeStoredRefreshToken(tokens.refreshToken);
    emit();
  },

  clear: (): void => {
    accessToken = null;
    refreshToken = null;
    writeStoredRefreshToken(null);
    emit();
  },

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
