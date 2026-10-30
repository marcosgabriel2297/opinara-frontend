import { t } from '@/i18n';
import { formatDate } from '@/lib/format';

import { type Review } from './api/schemas';

/**
 * Textos que dependen de quién dejó la reseña. Una anónima no tiene nombre, así que se identifica
 * por su fecha: "la reseña anónima del 31 ago 2026".
 */
export function reviewLabel(review: Review, named: string, anonymous: string): string {
  const name = review.reviewer.isAnonymous ? undefined : review.reviewer.displayName;
  if (name === undefined) return anonymous.replace('{date}', formatDate(review.createdAt) ?? '');
  return named.replace('{name}', name);
}

/** El `h1` del detalle. */
export function reviewTitle(review: Review): string {
  return reviewLabel(review, t.reviews.detailTitle, t.reviews.detailTitleAnonymous);
}
