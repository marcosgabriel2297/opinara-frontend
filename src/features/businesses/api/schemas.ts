import { z } from 'zod';

/**
 * Lo que habilita el plan del negocio. La UI decide por esto, nunca por el nombre del plan.
 * Una funcionalidad que este frontend no conoce (de un backend más nuevo) se ignora.
 */
export const businessFeatureSchema = z.enum(['REVIEWS', 'LOYALTY']);
export type BusinessFeature = z.infer<typeof businessFeatureSchema>;

/**
 * Planes que incluyen reseñas. Solo para entender a un backend anterior a la funcionalidad
 * `REVIEWS`, que no la manda: sin esto, si este frontend llegara antes a producción, a todos los
 * negocios les desaparecerían las reseñas. El backend actual manda `features` completo.
 */
const PLANS_WITH_REVIEWS = new Set(['REVIEWS', 'REVIEWS_LOYALTY']);

export const businessRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type BusinessRole = z.infer<typeof businessRoleSchema>;

/** Cada negocio viene con el rol del usuario que pregunta. */
export const businessSchema = z
  .object({
    urn: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.enum(['ACTIVE', 'SUSPENDED']),
    timezone: z.string(),
    createdAt: z.string(),
    /** Versión del logo (ver `logoUrl`); `null` si el negocio no tiene. */
    logoUpdatedAt: z.string().nullable(),
    role: businessRoleSchema,
    /** Un backend anterior a los planes no lo manda: es el de entrada, el de reseñas. */
    plan: z.string().default('REVIEWS'),
    features: z.array(z.string()).default([]),
  })
  .transform(({ features, ...business }) => {
    const known = features.filter(
      (feature): feature is BusinessFeature => businessFeatureSchema.safeParse(feature).success,
    );
    const withReviews =
      !known.includes('REVIEWS') && PLANS_WITH_REVIEWS.has(business.plan) ? ['REVIEWS' as const, ...known] : known;
    return { ...business, features: withReviews };
  });

export type Business = z.infer<typeof businessSchema>;

export const businessesSchema = z.array(businessSchema);

export function hasFeature(business: Pick<Business, 'features'>, feature: BusinessFeature): boolean {
  return business.features.includes(feature);
}
