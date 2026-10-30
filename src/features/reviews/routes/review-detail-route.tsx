import { useLocation, useParams } from 'react-router';

import { ErrorState } from '@/components/error-state';
import { BackLink, PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { t } from '@/i18n';

import { ReplyForm } from '../components/reply-form';
import { ReviewCard } from '../components/review-card';
import { reviewListReturn } from '../list-return';
import { reviewTitle } from '../review-labels';
import { useReview } from '../queries';

/**
 * Detalle de una reseña. La sucursal va en la ruta (no en un query param) para que el link
 * funcione solo: una reseña siempre se pide dentro de su sucursal.
 */
export default function ReviewDetailRoute() {
  const business = useCurrentBusiness();
  const { locationUrn, reviewUrn } = useParams<{ locationUrn: string; reviewUrn: string }>();

  const reviewQuery = useReview(business.urn, locationUrn ?? '', reviewUrn ?? '');
  // Vuelve al listado como se dejó (filtros y página), no al listado limpio.
  const backTo = reviewListReturn(useLocation().state);

  return (
    <div className="grid max-w-3xl gap-6">
      {/* El regreso queda montado siempre (también mientras carga): si se reemplazara al llegar los
          datos, un clic justo en ese momento se perdería. */}
      <div className="grid gap-3">
        <BackLink to={backTo} label={t.reviews.backToList} />
        {reviewQuery.isPending && (
          <>
            <Spinner label={t.common.loading} />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-40 w-full" />
          </>
        )}
        {/* Título visible, como el resto de las pantallas: h1 la reseña, h2 el formulario. */}
        {reviewQuery.data !== undefined && <PageHeader title={reviewTitle(reviewQuery.data)} className="mb-0" />}
      </div>

      {reviewQuery.isError && <ErrorState error={reviewQuery.error} onRetry={() => void reviewQuery.refetch()} />}

      {reviewQuery.data !== undefined && (
        <>
          {/* La respuesta ya está en el formulario para editarla: acá no se repite. */}
          <Card>
            <CardContent>
              <ReviewCard review={reviewQuery.data} showReply={false} />
            </CardContent>
          </Card>
          {/* `key`: otra reseña es otro formulario, con su propio borrador. */}
          <ReplyForm key={reviewQuery.data.urn} businessUrn={business.urn} review={reviewQuery.data} backTo={backTo} />
        </>
      )}
    </div>
  );
}
