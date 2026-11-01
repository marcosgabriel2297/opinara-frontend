import { browser } from './browser';

const RELOADED_AT_KEY = 'opinara.stale-chunks-reloaded-at';
/** Si recargar no alcanzó (el chunk sigue sin cargar), no insistir: que se vea el error de la ruta. */
const RETRY_WINDOW_MS = 10_000;

let staleChunkFailed = false;

/**
 * Después de un deploy, una pestaña abierta sigue pidiendo los chunks de la versión anterior, que
 * ya no existen: Cloudflare responde `index.html` (modo SPA) y el import dinámico falla. Vite avisa
 * con `vite:preloadError`. Acá solo se anota: el error sigue hasta el `errorElement` de la ruta,
 * que recarga con la URL de destino ya puesta (si se recargara acá, se volvería a la de origen).
 */
export function watchStaleChunks(): void {
  window.addEventListener('vite:preloadError', () => {
    staleChunkFailed = true;
  });
}

/** El error de la ruta vino de un chunk de otra versión, y no se recargó hace un momento por lo mismo. */
export function shouldReloadForStaleChunk(): boolean {
  if (!staleChunkFailed) return false;
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0) >= RETRY_WINDOW_MS;
  } catch {
    // Sin sessionStorage no hay forma de cortar un bucle: mejor no recargar.
    return false;
  }
}

/** Recarga para traer el `index.html` nuevo, que apunta a los chunks vigentes. */
export function reloadForStaleChunk(): void {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    return;
  }
  browser.reload();
}

/** Solo para tests: el estado vive en el módulo. */
export function resetStaleChunksForTests(): void {
  staleChunkFailed = false;
}
