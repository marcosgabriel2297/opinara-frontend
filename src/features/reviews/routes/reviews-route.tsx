import { MessageSquareIcon, StarIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { useLocations } from '@/features/locations/queries';
import { plural, t } from '@/i18n';

import { DEFAULT_PAGE_SIZE } from '../api/schemas';
import { ReviewCard } from '../components/review-card';
import { ReviewFilters } from '../components/review-filters';
import { ReviewListSkeleton } from '../components/review-list-skeleton';
import { reviewListState } from '../list-return';
import { SyncButton } from '../components/sync-button';
import { useReviews, useReviewsSummary, useUnansweredCount } from '../queries';
import { useReviewSearchState } from '../use-review-search-state';

export default function ReviewsRoute() {
  const business = useCurrentBusiness();
  const locationsQuery = useLocations(business.urn);
  const { state, update, clear, hasFilters } = useReviewSearchState();
  const location = useLocation();

  const locations = locationsQuery.data ?? [];
  const firstLocationUrn = locations[0]?.urn;

  // Sin sucursal en la URL, fijamos la primera: así el link que se comparte siempre es completo.
  useEffect(() => {
    if (state.locationUrn !== null || firstLocationUrn === undefined) return;

    // `page` explícito: completar la sucursal no es un cambio de filtro, así que un link
    // como `/reviews?page=3` no tiene por qué volver a la primera página.
    update({ locationUrn: firstLocationUrn, page: state.page }, { replace: true });
  }, [state.locationUrn, state.page, firstLocationUrn, update]);

  const selectedUrn = state.locationUrn ?? firstLocationUrn ?? null;

  const reviewsQuery = useReviews(business.urn, selectedUrn, {
    page: state.page,
    limit: DEFAULT_PAGE_SIZE,
    ...(state.rating === undefined ? {} : { rating: state.rating }),
    ...(state.hasReply === undefined ? {} : { hasReply: state.hasReply }),
  });

  // El contador de "sin responder". Si el listado ya muestra exactamente eso (filtro "Sin responder"
  // y ninguno más), su `total` es el mismo número: se usa ese y no se hace otro pedido.
  const listIsUnanswered = state.hasReply === false && state.rating === undefined;
  const unansweredQuery = useUnansweredCount(business.urn, selectedUrn, !listIsUnanswered);
  const unanswered = listIsUnanswered ? reviewsQuery.data?.total : unansweredQuery.data;

  if (locationsQuery.isPending) {
    return (
      <>
        <PageHeader title={t.reviews.title} />
        <ReviewListSkeleton />
      </>
    );
  }
  if (locationsQuery.isError) {
    return <ErrorState error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />;
  }

  if (locations.length === 0) {
    return (
      <>
        <PageHeader title={t.reviews.title} />
        <EmptyState
          icon={<StarIcon aria-hidden />}
          title={t.reviews.empty.noLocations}
          description={t.reviews.empty.noLocationsBody}
          action={
            <Button asChild>
              <Link viewTransition to={paths.google}>
                {t.reviews.empty.noLocationsAction}
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const page = reviewsQuery.data;

  return (
    <>
      <PageHeader
        title={t.reviews.title}
        actions={<QueueButton businessUrn={business.urn} />}
        description={
          unanswered === undefined ? undefined : (
            <UnansweredSummary
              count={unanswered}
              severalLocations={locations.length > 1}
              alreadyFiltered={listIsUnanswered}
              onShow={() => {
                update({ hasReply: false, rating: undefined });
              }}
            />
          )
        }
      />

      {/* Desde `lg`, la lista a ancho de lectura (a pantalla completa el comentario llegaba a ~150
          caracteres por línea) y al costado los filtros y la sincronización, siempre a mano. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
        <aside className="grid gap-4 lg:sticky lg:top-20 lg:order-last">
          <ReviewFilters
            locations={locations}
            state={{ ...state, locationUrn: selectedUrn }}
            showClear={hasFilters && page?.items.length !== 0}
            onChange={update}
            onClear={clear}
          />
          <SyncButton business={business} locations={locations} />
        </aside>

        <div className="grid min-w-0 gap-4">
          {reviewsQuery.isPending && <ReviewListSkeleton />}

          {reviewsQuery.isError && (
            <ErrorState error={reviewsQuery.error} onRetry={() => void reviewsQuery.refetch()} />
          )}

          {page?.items.length === 0 && (
            <EmptyState
              icon={<MessageSquareIcon aria-hidden />}
              title={hasFilters ? t.reviews.empty.noResults : t.reviews.empty.noReviews}
              description={hasFilters ? t.reviews.empty.noResultsBody : t.reviews.empty.noReviewsBody}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clear}>
                    {t.reviews.filters.clear}
                  </Button>
                ) : undefined
              }
            />
          )}

          {page !== undefined && page.items.length > 0 && (
            <>
              {/* Una sola superficie con filas separadas: se recorre de un vistazo, sin una card por
                  reseña. Mientras llega otra página la lista queda atenuada, no salta. */}
              <Card className="gap-0 py-0">
                <ul
                  className="divide-y transition-opacity aria-busy:opacity-60"
                  aria-busy={reviewsQuery.isFetching && !reviewsQuery.isPending}
                >
                  {page.items.map((review) => (
                    <li key={review.urn} className="px-4 py-4 sm:px-5">
                      <ReviewCard
                        review={review}
                        detailHref={paths.review(review.locationUrn, review.urn)}
                        listState={reviewListState(location.pathname, location.search)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>

              <Pagination
                page={page.page}
                limit={page.limit}
                total={page.total}
                disabled={reviewsQuery.isFetching}
                onPageChange={(next) => {
                  update({ page: next });
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** La entrada al modo foco, con todas las pendientes del negocio (no solo las de esta sucursal). */
function QueueButton({ businessUrn }: { businessUrn: string }) {
  const summaryQuery = useReviewsSummary(businessUrn);
  const pending = summaryQuery.data?.unanswered ?? 0;
  if (pending === 0) return null;

  return (
    <Button asChild>
      <Link viewTransition to={paths.replyQueue}>
        {plural(pending, t.reviews.queue.startCount)}
      </Link>
    </Button>
  );
}

/**
 * Lo primero que un negocio quiere saber: cuántas reseñas esperan respuesta. El número es de la
 * sucursal elegida (la API es por sucursal), y si hay varias el texto lo aclara.
 */
function UnansweredSummary({
  count,
  severalLocations,
  alreadyFiltered,
  onShow,
}: {
  count: number;
  severalLocations: boolean;
  alreadyFiltered: boolean;
  onShow: () => void;
}) {
  const where = severalLocations ? ` ${t.reviews.inThisLocation}` : '';
  if (count === 0) return <>{`${t.reviews.allAnswered}${where}`}</>;

  const label = `${plural(count, t.reviews.pending)}${where}`;
  if (alreadyFiltered) return <>{label}</>;

  return (
    <button
      type="button"
      onClick={onShow}
      className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
    >
      {label}
    </button>
  );
}
