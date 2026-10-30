import { type BusinessRole } from '@/features/businesses/api/schemas';

/**
 * Agregar sucursales a mano: el backend lo permite a OWNER y ADMIN (`POST /locations`). La UI no
 * ofrece lo que el servidor va a rechazar; el permiso real lo sigue decidiendo el backend.
 */
export function canManageLocations(role: BusinessRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}
