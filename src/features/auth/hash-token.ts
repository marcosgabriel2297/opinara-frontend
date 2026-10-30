/**
 * Lee el token de los links que llegan por mail (`…#token=…`) y lo saca de la barra de direcciones.
 *
 * Va después de `#` para que el navegador no lo mande a ningún servidor ni en el `Referer`; una vez
 * leído, tampoco tiene que quedar en el historial ni en una captura de pantalla.
 */
export function takeHashToken(): string | null {
  const match = /(?:^#|&)token=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (match?.[1] === undefined) return null;

  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  return match[1];
}
