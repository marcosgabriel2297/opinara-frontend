import { t } from '@/i18n';
import { formatRelativeDays } from '@/lib/format';
import { cn } from '@/lib/utils';

import { type Review } from '../api/schemas';
import { ReviewerAvatar } from './reviewer-avatar';
import { StarRating } from './star-rating';

/**
 * La reseña como cita: quién, cuántas estrellas, hace cuánto y lo que dijo, a tamaño de lectura.
 * `size="lg"` en el modo foco, donde es lo único que hay que leer.
 */
export function ReviewQuote({
  review,
  locationTitle,
  size = 'md',
}: {
  review: Review;
  /** Con varias sucursales, de cuál es. */
  locationTitle?: string | undefined;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <ReviewerAvatar reviewer={review.reviewer} />
      </div>
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <StarRating rating={review.rating} />
        <time dateTime={review.createdAt}>{formatRelativeDays(review.createdAt)}</time>
        {locationTitle !== undefined && <span>{locationTitle}</span>}
      </p>
      {review.comment === undefined ? (
        <p className="text-muted-foreground font-display text-xl italic">{t.reviews.noCommentQuote}</p>
      ) : (
        <blockquote
          className={cn(
            'font-display leading-snug tracking-[-0.01em] whitespace-pre-line',
            size === 'lg' ? 'text-[1.625rem] md:text-[2.25rem]' : 'text-xl',
          )}
        >
          “{review.comment}”
        </blockquote>
      )}
    </div>
  );
}
