import { StarIcon } from 'lucide-react';

import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Calificación en estrellas.
 *
 * `rating` puede ser 0: Google no siempre informa calificación. En ese caso no dibujamos
 * cinco estrellas vacías (se leería como "1 estrella y algo"), decimos que no hay.
 */
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  if (rating <= 0) {
    return <span className="text-muted-foreground text-sm">{t.reviews.noRating}</span>;
  }

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={t.reviews.ratingLabel.replace('{rating}', String(rating))}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          aria-hidden
          className={cn('size-4', star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/75')}
        />
      ))}
    </span>
  );
}
