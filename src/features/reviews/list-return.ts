import { paths } from '@/app/paths';

/** Lo que el listado deja en el estado de navegación al abrir una reseña. */
export interface ReviewListState {
  reviewsList: string;
}

/** Estado para el link al detalle: la URL del listado tal como estaba (filtros y página). */
export function reviewListState(pathname: string, search: string): ReviewListState {
  return { reviewsList: `${pathname}${search}` };
}

/**
 * A dónde vuelve "Volver a las reseñas": al listado tal como se dejó, si eso vino en el estado de
 * navegación; si no (link directo, recarga), al listado sin filtros.
 *
 * `location.state` es `unknown` y lo puede escribir cualquiera, así que se valida: solo se acepta
 * exactamente la ruta del listado, del mismo origen, con su query. Nada de detalles, otras rutas,
 * `//dominio` ni URLs absolutas: sería un redirect abierto.
 */
export function reviewListReturn(state: unknown): string {
  if (typeof state !== 'object' || state === null) return paths.reviews;
  const target = (state as { reviewsList?: unknown }).reviewsList;
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return paths.reviews;

  const base = 'http://opinara.invalid';
  let url: URL;
  try {
    url = new URL(target, base);
  } catch {
    return paths.reviews;
  }
  if (url.origin !== base || url.pathname !== paths.reviews) return paths.reviews;

  return `${url.pathname}${url.search}`;
}
