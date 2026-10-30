const PENDING_KEY = 'opinara.google-connecting';

/**
 * Qué negocio estaba conectando cuando mandamos al usuario a Google.
 *
 * Hace falta porque el callback del backend redirige a una URL fija, **sin el negocio**: cuando
 * el usuario vuelve, esto es lo único que lo dice. Va en `sessionStorage` (no `localStorage`)
 * porque el dato solo tiene sentido dentro de esa pestaña y de ese viaje.
 */
export function rememberPendingConnection(businessUrn: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, businessUrn);
  } catch {
    // Sin esto la vuelta cae al negocio seleccionado, que es el mismo en el 99% de los casos.
  }
}

export function readPendingConnection(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingConnection(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // No pasa nada: se pisa en la próxima conexión.
  }
}
