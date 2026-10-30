import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export interface UrlParamsUpdater {
  searchParams: URLSearchParams;
  /** `undefined` borra el parámetro. */
  update: (changes: Record<string, string | undefined>, options?: { replace?: boolean }) => void;
}

/**
 * Escribir filtros en la URL sin pisar los demás parámetros.
 *
 * Está en un solo lugar por un motivo concreto: la forma funcional de `setSearchParams` recibe
 * los params del render en el que se creó el setter, no los actuales, y con eso se perdían
 * parámetros al combinar cambios. Partir de `searchParams` del render vigente —del que este
 * callback depende— es lo correcto.
 */
export function useUrlParams(): UrlParamsUpdater {
  const [searchParams, setSearchParams] = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | undefined>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) next.delete(key);
        else next.set(key, value);
      }

      // Cambiar un filtro no es ir a otra pantalla: la página se queda donde está
      // (`ScrollRestoration` del layout sube al principio solo al cambiar de sección).
      setSearchParams(next, { replace: options?.replace ?? false, preventScrollReset: true });
    },
    [searchParams, setSearchParams],
  );

  return { searchParams, update };
}
