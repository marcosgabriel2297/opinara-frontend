import { api } from '@/lib/http';

import { locationSchema, locationsSchema, type Location } from './schemas';

/** Sin paginación: devuelve el array completo. */
export function listLocations(businessUrn: string): Promise<Location[]> {
  return api.get(`/businesses/${encodeURIComponent(businessUrn)}/locations`, { schema: locationsSchema });
}

export interface CreateLocationInput {
  title: string;
  placeId: string;
  address?: string;
}

/** Alta manual (OWNER o ADMIN). El backend arma el link de reseña a partir del Place ID. */
export function createLocation(businessUrn: string, input: CreateLocationInput): Promise<Location> {
  return api.post(`/businesses/${encodeURIComponent(businessUrn)}/locations`, { body: input, schema: locationSchema });
}
