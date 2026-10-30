const SELECTED_KEY = 'opinara.business';

/**
 * Qué negocio eligió el usuario. Va en `localStorage` y no en la URL.
 *
 * Tradeoff: las rutas quedan limpias (`/reviews` en vez de `/businesses/:urn/reviews`), que es
 * lo normal cuando casi todo el mundo tiene un solo negocio; a cambio, un link compartido se
 * abre en el negocio que tenga seleccionado quien lo recibe. Si algún día hay usuarios con
 * varios negocios en serio, esto pasa a la URL.
 */
export function readSelectedBusiness(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function writeSelectedBusiness(businessUrn: string | null): void {
  try {
    if (businessUrn === null) localStorage.removeItem(SELECTED_KEY);
    else localStorage.setItem(SELECTED_KEY, businessUrn);
  } catch {
    // Sin persistencia, cada pestaña arranca en el primer negocio. Degradado, no roto.
  }
}
