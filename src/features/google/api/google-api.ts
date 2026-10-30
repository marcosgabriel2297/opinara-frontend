import { api } from '@/lib/http';

import {
  authorizationRequestSchema,
  availableLocationSchema,
  googleAccountSchema,
  googleConnectionSchema,
  importedLocationsSchema,
  type AvailableLocation,
  type GoogleAccount,
  type GoogleConnection,
} from './schemas';
import { z } from 'zod';

const base = (businessUrn: string) => `/businesses/${encodeURIComponent(businessUrn)}/google`;

/** Devuelve la URL de consentimiento de Google. Solo OWNER. */
export function startConnection(businessUrn: string): Promise<{ authorizationUrl: string; expiresAt: string }> {
  return api.post(`${base(businessUrn)}/connect`, { schema: authorizationRequestSchema });
}

export function getConnection(businessUrn: string): Promise<GoogleConnection> {
  return api.get(`${base(businessUrn)}/connection`, { schema: googleConnectionSchema });
}

export function disconnect(businessUrn: string): Promise<void> {
  return api.delete(`${base(businessUrn)}/connection`);
}

export function listAccounts(businessUrn: string): Promise<GoogleAccount[]> {
  return api.get(`${base(businessUrn)}/accounts`, { schema: z.array(googleAccountSchema) });
}

export function listAvailableLocations(businessUrn: string, accountName: string): Promise<AvailableLocation[]> {
  return api.get(`${base(businessUrn)}/locations`, {
    query: { accountName },
    schema: z.array(availableLocationSchema),
  });
}

export function importLocations(businessUrn: string, input: { accountName: string; locationNames: string[] }) {
  return api.post(`${base(businessUrn)}/locations/import`, { body: input, schema: importedLocationsSchema });
}
