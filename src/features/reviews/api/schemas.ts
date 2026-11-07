import { z } from 'zod';

/** Tope del backend (`MAX_REPLY_LENGTH`). */
export const MAX_REPLY_LENGTH = 4096;
export const DEFAULT_PAGE_SIZE = 20;

export const reviewSchema = z.object({
  urn: z.string(),
  locationUrn: z.string(),
  /** Puede ser 0: Google no siempre informa calificación. */
  rating: z.number(),
  /** Puede faltar: hay reseñas que son solo estrellas. */
  comment: z.string().optional(),
  reviewer: z.object({
    /** Ausente cuando la reseña es anónima. */
    displayName: z.string().optional(),
    profilePhotoUrl: z.string().optional(),
    isAnonymous: z.boolean(),
  }),
  /** Fechas de Google, no nuestras. */
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Ausente si nadie respondió todavía. */
  reply: z.object({ comment: z.string(), updatedAt: z.string().optional() }).optional(),
  googleReviewUrl: z.string().optional(),
  syncedAt: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

export const paginatedReviewsSchema = z.object({
  items: z.array(reviewSchema),
  /** Arranca en 0. */
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type PaginatedReviews = z.infer<typeof paginatedReviewsSchema>;

const windowSchema = z.object({ count: z.number(), averageRating: z.number().nullable() });

/** Las cifras del negocio entero (todas las sucursales), calculadas por el backend. */
export const reviewsSummarySchema = z.object({
  total: z.number(),
  unanswered: z.number(),
  oldestUnansweredAt: z.string().nullable(),
  /** Sin las reseñas que no tienen calificación; `null` si no hay ninguna calificada. */
  averageRating: z.number().nullable(),
  ratingCounts: z.object({ '1': z.number(), '2': z.number(), '3': z.number(), '4': z.number(), '5': z.number() }),
  last30Days: windowSchema,
  previous30Days: windowSchema,
  /** Si el servidor puede sugerir respuestas (tiene credenciales del modelo). */
  replySuggestions: z.boolean(),
});

export type ReviewsSummary = z.infer<typeof reviewsSummarySchema>;

export const replySuggestionSchema = z.object({ comment: z.string() });
