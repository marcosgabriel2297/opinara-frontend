/**
 * Las tarjetas de sellos guardadas en este teléfono (sus tokens). Así `/card` sin el link sigue
 * mostrando la tarjeta, y quien tiene tarjetas de varias sucursales o comercios elige cuál.
 *
 * Es del cliente final, no del usuario de Opinara: no se borra al cerrar sesión.
 */
const KEY = 'opinara.loyalty-cards';
const MAX_CARDS = 10;

export function readCardTokens(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function write(tokens: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens.slice(0, MAX_CARDS)));
  } catch {
    // Navegación privada o almacenamiento lleno: la tarjeta se sigue viendo con el link.
  }
}

/** La más reciente primero. */
export function rememberCardToken(token: string): void {
  write([token, ...readCardTokens().filter((stored) => stored !== token)]);
}

export function forgetCardToken(token: string): void {
  write(readCardTokens().filter((stored) => stored !== token));
}

/**
 * El token del link (`/card#token=…`). A diferencia de los links de contraseña, **no se saca de la
 * URL**: en iPhone, una página agregada a la pantalla de inicio no comparte el almacenamiento de
 * Safari, así que el link mismo tiene que llevar la tarjeta.
 */
export function cardTokenFromHash(hash: string): string | null {
  return /(?:^#|&)token=([A-Za-z0-9_-]+)/.exec(hash)?.[1] ?? null;
}
