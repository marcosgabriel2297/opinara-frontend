/**
 * Modo demo: el producto entero con datos de ejemplo, sin cuenta ni conexión con Google.
 *
 * Usa los mismos mocks que los tests (MSW en el navegador), cargados recién cuando se entra a la
 * demo: a quien no la usa no le cuesta ni un byte. Vive en `sessionStorage`, así que cerrar la
 * pestaña la termina.
 */
const DEMO_KEY = 'opinara.demo';

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function startDemo(): void {
  try {
    sessionStorage.setItem(DEMO_KEY, '1');
  } catch {
    // Sin almacenamiento no hay demo: la recarga deja todo como estaba.
  }
  window.location.assign('/');
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(DEMO_KEY);
  } catch {
    // Nada que limpiar.
  }
  window.location.assign('/login');
}
