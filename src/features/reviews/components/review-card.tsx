import { ExternalLinkIcon } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { type Review } from '../api/schemas';
import { type ReviewListState } from '../list-return';
import { reviewLabel } from '../review-labels';
import { ReviewerAvatar } from './reviewer-avatar';
import { StarRating } from './star-rating';

interface ReviewCardProps {
  review: Review;
  /** Sin link cuando la card ya es el detalle. */
  detailHref?: string;
  /** Viaja con el link al detalle: es a dónde vuelve "Volver a las reseñas". */
  listState?: ReviewListState;
  /**
   * En el detalle la respuesta ya está en el formulario para editarla: mostrarla también acá la
   * duplicaba.
   */
  showReply?: boolean;
  className?: string;
}

/**
 * Una reseña. No trae superficie propia: en el listado es una fila de la lista (separadas por
 * líneas, no una card por reseña) y en el detalle va adentro de una card.
 *
 * El orden es el de lectura de quien atiende el negocio: quién y cuántas estrellas, qué dijo, si ya
 * se le contestó y qué hacer. "Sin responder" es lo único marcado: es la excepción a atender.
 */
export function ReviewCard({ review, detailHref, listState, showReply = true, className }: ReviewCardProps) {
  const unanswered = review.reply === undefined;

  return (
    <article className={cn('grid gap-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <ReviewerAvatar reviewer={review.reviewer} />
        <time dateTime={review.createdAt} className="text-muted-foreground shrink-0 pt-2 text-sm">
          {formatDate(review.createdAt)}
        </time>
      </div>

      <div className="grid gap-2 sm:pl-12">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRating rating={review.rating} />
          {unanswered && <Badge variant="warning">{t.reviews.filters.withoutReply}</Badge>}
        </div>

        {review.comment === undefined ? (
          <p className="text-muted-foreground text-sm italic">{t.reviews.noComment}</p>
        ) : (
          <p className="leading-relaxed whitespace-pre-line">{review.comment}</p>
        )}

        {showReply && review.reply !== undefined && (
          <div className="bg-muted/70 border-l-brand mt-1 grid gap-1 rounded-md border-l-2 px-3 py-2">
            <p className="text-muted-foreground text-xs font-medium">
              {t.reviews.yourReply}
              {review.reply.updatedAt !== undefined &&
                ` · ${t.reviews.repliedOn} ${formatDate(review.reply.updatedAt) ?? ''}`}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{review.reply.comment}</p>
          </div>
        )}

        {(detailHref !== undefined || review.googleReviewUrl !== undefined) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            {detailHref !== undefined && (
              <Link
                viewTransition
                to={detailHref}
                state={listState}
                // Cada fila dice de qué reseña es: en la lista de links de un lector de pantalla,
                // diez "Responder" iguales no sirven. El nombre incluye el texto visible.
                aria-label={
                  unanswered
                    ? reviewLabel(review, t.reviews.replyTo, t.reviews.replyToAnonymous)
                    : reviewLabel(review, t.reviews.detailOf, t.reviews.detailOfAnonymous)
                }
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {unanswered ? t.reviews.reply.title : t.reviews.detail}
              </Link>
            )}

            {review.googleReviewUrl !== undefined && (
              <a
                href={review.googleReviewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {t.reviews.seeOnGoogle}
                {/* El espacio va afuera del span: adentro, el cálculo del nombre accesible lo recorta y
                    quedaba "Ver en Googlela reseña…". */}{' '}
                <span className="sr-only">
                  {reviewLabel(review, t.reviews.seeOnGoogleContext, t.reviews.seeOnGoogleContextAnonymous)}
                </span>
                <ExternalLinkIcon aria-hidden className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
