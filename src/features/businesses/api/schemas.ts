import { z } from 'zod';

export const businessRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type BusinessRole = z.infer<typeof businessRoleSchema>;

/** Cada negocio viene con el rol del usuario que pregunta. */
export const businessSchema = z.object({
  urn: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  timezone: z.string(),
  createdAt: z.string(),
  /** Versión del logo (ver `logoUrl`); `null` si el negocio no tiene. */
  logoUpdatedAt: z.string().nullable(),
  role: businessRoleSchema,
});

export type Business = z.infer<typeof businessSchema>;

export const businessesSchema = z.array(businessSchema);
