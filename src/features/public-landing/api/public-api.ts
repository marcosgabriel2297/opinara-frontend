import { API_BASE_URL } from '@/lib/http';

/**
 * Endpoint del backend que cuenta el escaneo y responde un `302` hacia Google (o hacia
 * `/r/no-disponible`, que muestra lo mismo que `/r/unavailable`, si la campaña no sirve). Se navega, no se pide con `fetch`: así el
 * navegador sigue la redirección solo y abre la app de Maps si está instalada.
 */
export function scanUrl(businessSlug: string, campaignSlug: string): string {
  return `${API_BASE_URL}/public/r/${encodeURIComponent(businessSlug)}/${encodeURIComponent(campaignSlug)}`;
}
