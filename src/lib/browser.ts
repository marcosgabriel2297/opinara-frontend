/**
 * Salidas del browser que la app necesita provocar.
 *
 * Están detrás de un objeto para poder espiarlas en los tests: `window.location` no se puede
 * reemplazar en jsdom sin romperle el prototipo.
 */
export const browser = {
  /** Saca al usuario de la SPA: se usa para mandarlo al consentimiento de Google. */
  redirectTo(url: string): void {
    window.location.assign(url);
  },
  /** Igual, pero sin dejar esta página en el historial: se usa para el salto del QR a Google. */
  replaceWith(url: string): void {
    window.location.replace(url);
  },
};
