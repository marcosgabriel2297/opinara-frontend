import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRevalidateConnectionOnRevoked } from '@/features/google/queries';
import { queryKeys } from '@/lib/query-keys';

import * as reviewsApi from './api/reviews-api';
import { type ReviewFilters } from './api/reviews-api';

export function useReviews(businessUrn: string, locationUrn: string | null, filters: ReviewFilters) {
  return useQuery({
    queryKey: queryKeys.reviews(businessUrn, locationUrn ?? '', { ...filters }),
    queryFn: () => {
      if (locationUrn === null) throw new Error('Falta la sucursal');

      return reviewsApi.listReviews(businessUrn, locationUrn, filters);
    },
    enabled: locationUrn !== null,
    // Al pasar de página, mantener lo anterior visible evita que la pantalla salte al vacío.
    placeholderData: (previous) => previous,
  });
}

/**
 * Cuántas reseñas sin responder tiene la sucursal: el `total` que devuelve la API pidiendo una sola
 * (`hasReply=false&limit=1`). No descarga las reseñas. Vive bajo la misma clave raíz que el listado,
 * así que responder, borrar o sincronizar lo actualizan solos.
 */
export function useUnansweredCount(businessUrn: string, locationUrn: string | null, enabled: boolean) {
  const filters = { page: 0, limit: 1, hasReply: false };

  return useQuery({
    queryKey: queryKeys.reviews(businessUrn, locationUrn ?? '', filters),
    queryFn: () => {
      if (locationUrn === null) throw new Error('Falta la sucursal');
      return reviewsApi.listReviews(businessUrn, locationUrn, filters);
    },
    enabled: enabled && locationUrn !== null,
    select: (page) => page.total,
  });
}

export function useReview(businessUrn: string, locationUrn: string, reviewUrn: string) {
  return useQuery({
    queryKey: queryKeys.review(businessUrn, locationUrn, reviewUrn),
    queryFn: () => reviewsApi.getReview(businessUrn, locationUrn, reviewUrn),
  });
}

/** Invalida el listado y el detalle: una respuesta cambia el filtro "respondidas" de ambos. */
function useInvalidateReviews(businessUrn: string) {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.allReviews(businessUrn) });
}

// Responder y borrar pasan por Google: si falla porque se revocó el acceso, se refresca el estado de
// la conexión para que el aviso global se entere (el mismo mecanismo que las pantallas de Google).
export function useReplyToReview(businessUrn: string, locationUrn: string, reviewUrn: string) {
  const invalidate = useInvalidateReviews(businessUrn);
  const revalidate = useRevalidateConnectionOnRevoked(businessUrn);

  return useMutation({
    mutationFn: (comment: string) =>
      revalidate(() => reviewsApi.replyToReview(businessUrn, locationUrn, reviewUrn, comment)),
    onSuccess: invalidate,
  });
}

export function useDeleteReply(businessUrn: string, locationUrn: string, reviewUrn: string) {
  const invalidate = useInvalidateReviews(businessUrn);
  const revalidate = useRevalidateConnectionOnRevoked(businessUrn);

  return useMutation({
    mutationFn: () => revalidate(() => reviewsApi.deleteReply(businessUrn, locationUrn, reviewUrn)),
    onSuccess: invalidate,
  });
}

export function useReviewsSummary(businessUrn: string) {
  return useQuery({
    queryKey: queryKeys.reviewsSummary(businessUrn),
    queryFn: () => reviewsApi.getReviewsSummary(businessUrn),
  });
}

/** Tope de la fila del modo foco: más de esto no se responde de una sentada. */
export const FOCUS_QUEUE_SIZE = 50;

/** La fila de respuesta: las sin responder de todas las sucursales, la que más espera primero. */
export function useReplyQueue(businessUrn: string) {
  const filters = { hasReply: false, order: 'oldest' as const, limit: FOCUS_QUEUE_SIZE, page: 0 };

  return useQuery({
    queryKey: queryKeys.businessReviews(businessUrn, filters),
    queryFn: () => reviewsApi.listBusinessReviews(businessUrn, filters),
    // La fila se arma una vez al entrar: si se refrescara mientras se responde, las reseñas
    // cambiarían de lugar bajo los dedos. Al volver a entrar se pide de nuevo.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** Las primeras de la fila (las que más esperan), para "Hoy". */
export function useNextInQueue(businessUrn: string, limit: number) {
  const filters = { hasReply: false, order: 'oldest' as const, limit, page: 0 };

  return useQuery({
    queryKey: queryKeys.businessReviews(businessUrn, filters),
    queryFn: () => reviewsApi.listBusinessReviews(businessUrn, filters),
  });
}

interface ReviewRef {
  locationUrn: string;
  reviewUrn: string;
}

/**
 * Responder y deshacer en el modo foco: la reseña viaja en las variables (cambia a cada paso),
 * no en el hook como en el detalle.
 */
export function useQueueReply(businessUrn: string) {
  const invalidate = useInvalidateReviews(businessUrn);
  const revalidate = useRevalidateConnectionOnRevoked(businessUrn);

  const publish = useMutation({
    mutationFn: ({ locationUrn, reviewUrn, comment }: ReviewRef & { comment: string }) =>
      revalidate(() => reviewsApi.replyToReview(businessUrn, locationUrn, reviewUrn, comment)),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: ({ locationUrn, reviewUrn }: ReviewRef) =>
      revalidate(() => reviewsApi.deleteReply(businessUrn, locationUrn, reviewUrn)),
    onSuccess: invalidate,
  });

  return { publish, remove };
}

export function useSuggestReply(businessUrn: string) {
  return useMutation({
    mutationFn: ({ locationUrn, reviewUrn }: ReviewRef) => reviewsApi.suggestReply(businessUrn, locationUrn, reviewUrn),
  });
}
