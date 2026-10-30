import { type BusinessRole } from '@/features/businesses/api/schemas';

/**
 * Importar sucursales: el backend lo permite a OWNER y ADMIN (`POST /google/locations/import`).
 * La UI no ofrece lo que el servidor va a rechazar; el permiso real lo sigue decidiendo el backend.
 */
export function canImportLocations(role: BusinessRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}
