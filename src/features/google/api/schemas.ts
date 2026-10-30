import { z } from 'zod';

export const connectionStatusSchema = z.enum(['ACTIVE', 'REVOKED', 'DISCONNECTED']);
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export const googleConnectionSchema = z.object({
  urn: z.string(),
  status: connectionStatusSchema,
  scopes: z.array(z.string()),
  connectedAt: z.string().optional(),
  lastSyncAt: z.string().optional(),
  connectedByUserUrn: z.string(),
});

export type GoogleConnection = z.infer<typeof googleConnectionSchema>;

export const authorizationRequestSchema = z.object({
  authorizationUrl: z.string(),
  expiresAt: z.string(),
});

export const googleAccountSchema = z.object({
  /** Formato `accounts/{accountId}`. */
  name: z.string(),
  displayName: z.string(),
  type: z.string().optional(),
  verificationState: z.string().optional(),
});

export type GoogleAccount = z.infer<typeof googleAccountSchema>;

/** Sucursal de Google todavía no importada (o ya importada: lo dice `imported`). */
export const availableLocationSchema = z.object({
  /** Formato `locations/{locationId}`. */
  name: z.string(),
  locationId: z.string(),
  title: z.string(),
  storeCode: z.string().optional(),
  placeId: z.string().optional(),
  mapsUri: z.string().optional(),
  newReviewUri: z.string().optional(),
  address: z.string().optional(),
  hasVoiceOfMerchant: z.boolean(),
  imported: z.boolean(),
});

export type AvailableLocation = z.infer<typeof availableLocationSchema>;

export const importedLocationsSchema = z.array(
  z.object({
    urn: z.string(),
    title: z.string(),
    googleReviewUrl: z.string().optional(),
  }),
);
