import { api } from '@/lib/http';

import {
  paginatedReviewsSchema,
  replySuggestionSchema,
  reviewSchema,
  reviewsSummarySchema,
  syncReportSchema,
  type PaginatedReviews,
  type Review,
  type ReviewsSummary,
  type SyncReport,
} from './schemas';

const reviewsBase = (businessUrn: string, locationUrn: string) =>
  `/businesses/${encodeURIComponent(businessUrn)}/locations/${encodeURIComponent(locationUrn)}/reviews`;

export interface ReviewFilters {
  page?: number;
  limit?: number;
  /** 1 a 5. `undefined` = todas. */
  rating?: number;
  hasReply?: boolean;
}

export function listReviews(
  businessUrn: string,
  locationUrn: string,
  filters: ReviewFilters,
): Promise<PaginatedReviews> {
  return api.get(reviewsBase(businessUrn, locationUrn), {
    query: {
      page: filters.page,
      limit: filters.limit,
      rating: filters.rating,
      hasReply: filters.hasReply,
    },
    schema: paginatedReviewsSchema,
  });
}

export interface BusinessReviewFilters extends ReviewFilters {
  locationUrn?: string;
  /** `oldest`: la que más espera primero (la fila de respuesta). */
  order?: 'newest' | 'oldest';
}

/** Las reseñas de todas las sucursales del negocio. */
export function listBusinessReviews(businessUrn: string, filters: BusinessReviewFilters): Promise<PaginatedReviews> {
  return api.get(`/businesses/${encodeURIComponent(businessUrn)}/reviews`, {
    query: {
      page: filters.page,
      limit: filters.limit,
      rating: filters.rating,
      hasReply: filters.hasReply,
      locationUrn: filters.locationUrn,
      order: filters.order,
    },
    schema: paginatedReviewsSchema,
  });
}

export function getReviewsSummary(businessUrn: string): Promise<ReviewsSummary> {
  return api.get(`/businesses/${encodeURIComponent(businessUrn)}/reviews/summary`, { schema: reviewsSummarySchema });
}

/** Un borrador para revisar: no publica nada. */
export async function suggestReply(businessUrn: string, locationUrn: string, reviewUrn: string): Promise<string> {
  const { comment } = await api.post(
    `${reviewsBase(businessUrn, locationUrn)}/${encodeURIComponent(reviewUrn)}/reply-suggestion`,
    { schema: replySuggestionSchema },
  );
  return comment;
}

export function getReview(businessUrn: string, locationUrn: string, reviewUrn: string): Promise<Review> {
  return api.get(`${reviewsBase(businessUrn, locationUrn)}/${encodeURIComponent(reviewUrn)}`, {
    schema: reviewSchema,
  });
}

/** `PUT` porque crea y edita indistintamente: así funciona `updateReply` de Google. */
export function replyToReview(
  businessUrn: string,
  locationUrn: string,
  reviewUrn: string,
  comment: string,
): Promise<Review> {
  return api.put(`${reviewsBase(businessUrn, locationUrn)}/${encodeURIComponent(reviewUrn)}/reply`, {
    body: { comment },
    schema: reviewSchema,
  });
}

export function deleteReply(businessUrn: string, locationUrn: string, reviewUrn: string): Promise<void> {
  return api.delete(`${reviewsBase(businessUrn, locationUrn)}/${encodeURIComponent(reviewUrn)}/reply`);
}

/** Sincroniza todas las sucursales del negocio. Requiere OWNER o ADMIN. */
export function syncBusiness(businessUrn: string): Promise<SyncReport> {
  return api.post(`/businesses/${encodeURIComponent(businessUrn)}/google/sync`, { schema: syncReportSchema });
}
