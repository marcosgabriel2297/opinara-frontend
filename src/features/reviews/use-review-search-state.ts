import { useCallback, useMemo } from 'react';

import { repliedValues, reviewsQuery } from '@/app/paths';
import { useUrlParams } from '@/lib/use-url-params';

/**
 * Filtros y paginación viven en la URL, no en `useState`.
 *
 * Así el botón "atrás" funciona, y un link a "las de 1 estrella sin responder" se puede
 * pasar por chat a quien tiene que contestarlas.
 */
export interface ReviewSearchState {
  locationUrn: string | null;
  rating: number | undefined;
  hasReply: boolean | undefined;
  /** 0-based, como el backend. En la URL se ve 1-based. */
  page: number;
}

export interface ReviewSearchChanges {
  locationUrn?: string;
  rating?: number | undefined;
  hasReply?: boolean | undefined;
  page?: number;
}

function parseRating(value: string | null): number | undefined {
  const rating = Number(value);

  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
}

function parseHasReply(value: string | null): boolean | undefined {
  if (value === repliedValues.yes) return true;
  if (value === repliedValues.no) return false;

  return undefined;
}

export function useReviewSearchState() {
  const { searchParams, update: updateParams } = useUrlParams();

  const state = useMemo<ReviewSearchState>(() => {
    const page = Number(searchParams.get(reviewsQuery.page) ?? '1');

    return {
      locationUrn: searchParams.get(reviewsQuery.location),
      rating: parseRating(searchParams.get(reviewsQuery.rating)),
      hasReply: parseHasReply(searchParams.get(reviewsQuery.replied)),
      page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
    };
  }, [searchParams]);

  const update = useCallback(
    (changes: ReviewSearchChanges, options?: { replace?: boolean }) => {
      // Cambiar un filtro sin volver a la página 1 deja al usuario mirando un vacío.
      const resetsPage = 'rating' in changes || 'hasReply' in changes || changes.locationUrn !== undefined;
      const page = changes.page ?? (resetsPage ? 0 : state.page);

      updateParams(
        {
          ...(changes.locationUrn === undefined ? {} : { [reviewsQuery.location]: changes.locationUrn }),
          ...('rating' in changes
            ? { [reviewsQuery.rating]: changes.rating === undefined ? undefined : String(changes.rating) }
            : {}),
          ...('hasReply' in changes
            ? {
                [reviewsQuery.replied]:
                  changes.hasReply === undefined ? undefined : changes.hasReply ? repliedValues.yes : repliedValues.no,
              }
            : {}),
          [reviewsQuery.page]: page === 0 ? undefined : String(page + 1),
        },
        options,
      );
    },
    [updateParams, state.page],
  );

  const clear = useCallback(() => {
    update({ rating: undefined, hasReply: undefined, page: 0 });
  }, [update]);

  const hasFilters = state.rating !== undefined || state.hasReply !== undefined;

  return { state, update, clear, hasFilters };
}
