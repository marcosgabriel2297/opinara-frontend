import { z } from 'zod';

/** Sucursal ya importada a Opinara. */
export const locationSchema = z.object({
  urn: z.string(),
  /**
   * `MANUAL`: cargada a mano con su Place ID, sin la API de Google. Sirve para los QR pero no trae
   * reseñas; si después se importa de Google, el backend la adopta (mismo `urn`) y pasa a `GOOGLE`.
   */
  source: z.enum(['GOOGLE', 'MANUAL']).optional(),
  title: z.string(),
  storeCode: z.string().optional(),
  address: z.string().optional(),
  placeId: z.string().optional(),
  mapsUri: z.string().optional(),
  /** Sin esto la sucursal no se puede usar en una campaña (`LOCATION_NOT_REVIEWABLE`). */
  googleReviewUrl: z.string().optional(),
  hasVoiceOfMerchant: z.boolean(),
  isActive: z.boolean(),
  lastReviewSyncAt: z.string().optional(),
  createdAt: z.string(),
});

export type Location = z.infer<typeof locationSchema>;

export const locationsSchema = z.array(locationSchema);
