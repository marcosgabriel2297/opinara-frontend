import { z } from 'zod';

/**
 * Lo que habilita el plan del negocio. La UI decide por esto, nunca por el nombre del plan. Un
 * backend anterior a los planes no lo manda: cuenta como ninguna.
 */
export const businessFeatureSchema = z.enum(['LOYALTY']);
export type BusinessFeature = z.infer<typeof businessFeatureSchema>;

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
  /** Desconocidas (de un plan más nuevo que este frontend) se ignoran en vez de romper la respuesta. */
  features: z
    .array(z.string())
    .default([])
    .transform((features) => features.filter((feature) => businessFeatureSchema.safeParse(feature).success))
    .pipe(z.array(businessFeatureSchema)),
});

export type Business = z.infer<typeof businessSchema>;

export const businessesSchema = z.array(businessSchema);

export function hasFeature(business: Pick<Business, 'features'>, feature: BusinessFeature): boolean {
  return business.features.includes(feature);
}
