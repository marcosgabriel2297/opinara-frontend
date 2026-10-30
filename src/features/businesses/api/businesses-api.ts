import { api, request } from '@/lib/http';

import { businessesSchema, businessSchema, type Business } from './schemas';

export function listBusinesses(): Promise<Business[]> {
  // Sin paginación: el backend devuelve el array completo.
  return api.get('/businesses', { schema: businessesSchema });
}

export interface CreateBusinessInput {
  name: string;
  slug?: string;
  timezone?: string;
}

export function createBusiness(input: CreateBusinessInput): Promise<Business> {
  return api.post('/businesses', { body: input, schema: businessSchema });
}

/** La imagen ya preparada por `prepareLogo` (achicada, en WebP o PNG). Responde el negocio actualizado. */
export function uploadLogo(businessUrn: string, image: Blob): Promise<Business> {
  return api.put(`/businesses/${encodeURIComponent(businessUrn)}/logo`, { body: image, schema: businessSchema });
}

export function removeLogo(businessUrn: string): Promise<Business> {
  // `api.delete` es para los 204; este responde el negocio.
  return request(`/businesses/${encodeURIComponent(businessUrn)}/logo`, { method: 'DELETE', schema: businessSchema });
}
