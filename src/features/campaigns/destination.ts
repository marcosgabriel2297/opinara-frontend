import { type Location } from '@/features/locations/api/schemas';

import { type Campaign } from './api/schemas';

/** Por qué el QR de una campaña no llevaría a Google. */
export type DestinationProblem =
  'campaign-paused' | 'campaign-archived' | 'location-missing' | 'location-inactive' | 'location-no-review-link';

export type Destination =
  { ok: true; location: Location; reviewUrl: string } | { ok: false; problem: DestinationProblem; location?: Location };

/**
 * ¿El QR de esta campaña lleva hoy a la pantalla de reseñas de Google?
 *
 * Replica las condiciones con las que el backend resuelve un escaneo (campaña activa, sucursal
 * existente y activa, con link de reseñas): si alguna falla, quien escanea termina en
 * "no disponible". Por eso, con cualquier problema, la pantalla no genera ni deja imprimir el QR:
 * mil calcos que no funcionan es el peor resultado posible para el negocio.
 *
 * `googleReviewUrl` es exactamente la URL a la que redirige el backend, así que es lo que se
 * muestra como destino.
 */
export function resolveDestination(campaign: Campaign, locations: Location[]): Destination {
  // La sucursal se busca primero: aunque la campaña esté pausada, la pantalla tiene que mostrar
  // su sucursal real y no "Sucursal no encontrada".
  const location = locations.find((candidate) => candidate.urn === campaign.locationUrn);
  const withLocation = location === undefined ? {} : { location };

  if (campaign.status === 'PAUSED') return { ok: false, problem: 'campaign-paused', ...withLocation };
  if (campaign.status === 'ARCHIVED') return { ok: false, problem: 'campaign-archived', ...withLocation };

  if (location === undefined) return { ok: false, problem: 'location-missing' };
  if (!location.isActive) return { ok: false, problem: 'location-inactive', location };

  const reviewUrl = location.googleReviewUrl;
  if (reviewUrl === undefined || !isHttpsUrl(reviewUrl)) {
    return { ok: false, problem: 'location-no-review-link', location };
  }

  return { ok: true, location, reviewUrl };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * El nombre de la sucursal sin repetir el del negocio: "Café de la Esquina — Centro" en el
 * negocio "Café de la Esquina" es "Centro". `null` si no agrega nada (es el mismo nombre).
 */
export function branchLabel(businessName: string, locationTitle: string): string | null {
  const business = businessName.trim().toLocaleLowerCase('es-AR');
  const title = locationTitle.trim();
  if (title.toLocaleLowerCase('es-AR') === business) return null;

  if (title.toLocaleLowerCase('es-AR').startsWith(business)) {
    const rest = title
      .slice(business.length)
      .replace(/^[\s\-–—·|:,]+/, '')
      .trim();
    return rest === '' ? null : rest;
  }

  return title;
}

/** Hosts que un teléfono no puede abrir: el QR quedaría apuntando a la compu de quien lo generó. */
export function isLocalOnlyUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0' ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname)
    );
  } catch {
    return false;
  }
}

/** La URL del QR sin el protocolo, para imprimirla como alternativa a escanear. */
export function printableUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
