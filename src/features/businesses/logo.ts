import { API_BASE_URL } from '@/lib/http';

import { type Business } from './api/schemas';

/**
 * Dónde está el logo de un negocio (`null` si no tiene). Lleva la versión: con ella el backend
 * deja que el navegador lo guarde para siempre, y al cambiar el logo cambia la URL.
 */
export function logoUrl(business: Pick<Business, 'slug' | 'logoUpdatedAt'>): string | null {
  if (business.logoUpdatedAt === null) return null;
  return `${publicLogoUrl(business.slug)}?v=${String(new Date(business.logoUpdatedAt).getTime())}`;
}

/**
 * Sin versión, para la pantalla del QR: ahí solo está el slug, y averiguar la versión sería otro
 * viaje antes de redirigir. El backend la cachea cinco minutos.
 */
export function publicLogoUrl(businessSlug: string): string {
  return `${API_BASE_URL}/public/businesses/${encodeURIComponent(businessSlug)}/logo`;
}
