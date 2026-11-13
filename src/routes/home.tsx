import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { SectionTitle } from '@/components/section-title';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/use-auth';
import { type Business, hasFeature } from '@/features/businesses/api/schemas';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { ScanChart } from '@/features/campaigns/components/scan-chart';
import { useCampaigns, useScansByWeek } from '@/features/campaigns/queries';
import { useGoogleConnection } from '@/features/google/queries';
import { useLocations } from '@/features/locations/queries';
import { type Review, type ReviewsSummary } from '@/features/reviews/api/schemas';
import { ReviewerAvatar } from '@/features/reviews/components/reviewer-avatar';
import { StarRating } from '@/features/reviews/components/star-rating';
import { useNextInQueue, useReviewsSummary } from '@/features/reviews/queries';
import { plural, t } from '@/i18n';
import { formatDate, formatRelativeDays } from '@/lib/format';
import { cn } from '@/lib/utils';

const NEXT_IN_LINE = 3;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 13) return t.home.greeting.morning;
  if (hour >= 13 && hour < 20) return t.home.greeting.afternoon;
  return t.home.greeting.night;
}

function todayLabel(now: Date): string {
  const text = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1);
}

/**
 * Hoy: lo que espera respuesta, en una frase y con un solo botón. Debajo, cómo vienen las reseñas
 * y los QR. Todo sale de endpoints del backend (resumen, fila, escaneos), sin cifras inventadas
 * del lado del cliente.
 */
export default function HomeRoute() {
  const business = useCurrentBusiness();
  // Con solo fidelización, la portada es la tarjeta de sellos.
  if (!hasFeature(business, 'REVIEWS')) return <Navigate to={paths.loyalty} replace />;
  return <ReviewsHome />;
}

function ReviewsHome() {
  const business = useCurrentBusiness();
  const { state } = useAuth();
  const summaryQuery = useReviewsSummary(business.urn);
  const locationsQuery = useLocations(business.urn);
  const campaignsQuery = useCampaigns(business.urn);
  const connectionQuery = useGoogleConnection(business.urn);

  const firstName = state.status === 'authenticated' ? state.user.name.split(/\s+/)[0] : undefined;
  const now = new Date();

  if (summaryQuery.isPending || locationsQuery.isPending) {
    return (
      <div className="grid gap-6">
        <Spinner label={t.common.loading} />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full max-w-3xl" />
        <Skeleton className="h-12 w-56" />
      </div>
    );
  }

  const summary = summaryQuery.data;
  const locations = locationsQuery.data;
  if (summary === undefined || locations === undefined) {
    const failed = summaryQuery.isError ? summaryQuery : locationsQuery;
    return (
      <>
        <h1 className="font-display mb-6 text-4xl">{t.home.title}</h1>
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      </>
    );
  }

  const campaigns = campaignsQuery.data ?? [];
  const connected = connectionQuery.data?.status === 'ACTIVE';

  const setup = [
    { label: t.home.setup.connect, done: connected, to: paths.google },
    { label: t.home.setup.import, done: locations.length > 0, to: paths.google },
    { label: t.home.setup.campaign, done: campaigns.length > 0, to: paths.campaigns },
  ];
  const setupPending = connectionQuery.isSuccess && campaignsQuery.isSuccess && setup.some((step) => !step.done);

  return (
    <div className="grid gap-14">
      <section className="grid gap-7">
        <p className="text-muted-foreground text-sm tracking-wide">{todayLabel(now)}</p>
        <h1 className="font-display max-w-4xl text-[2.5rem] leading-[1.04] tracking-[-0.025em] md:text-[3.75rem]">
          {greeting(now)}
          {firstName === undefined ? '.' : `, ${firstName}.`} <Headline summary={summary} />
        </h1>

        {summary.unanswered > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild size="lg" className="max-sm:w-full">
              <Link viewTransition to={paths.replyQueue}>
                {t.reviews.queue.start}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
            {summary.oldestUnansweredAt !== null && (
              <p className="text-muted-foreground text-sm">
                {t.home.oldestWaiting.replace('{when}', formatDate(summary.oldestUnansweredAt) ?? '')}
              </p>
            )}
          </div>
        )}
      </section>

      {setupPending && <SetupSteps steps={setup} />}

      {locations.length > 0 && (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-14">
          {summary.unanswered > 0 && (
            <NextInLine business={business} pending={summary.unanswered} locations={locations} />
          )}

          <div
            className={cn(
              'grid content-start gap-12',
              summary.unanswered > 0 ? 'lg:col-span-1' : 'lg:col-span-3 lg:grid-cols-3 lg:gap-14',
            )}
          >
            <RatingSection summary={summary} />
            <QrSection
              business={business}
              totalScans={campaigns.reduce((sum, campaign) => sum + campaign.stats.scans, 0)}
              hasCampaigns={campaigns.length > 0}
            />
            <GoogleSection
              connected={connected}
              lastSyncAt={connectionQuery.data?.lastSyncAt}
              loading={connectionQuery.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** La frase que sigue al saludo: lo único que hay que saber al entrar. */
function Headline({ summary }: { summary: ReviewsSummary }) {
  if (summary.unanswered > 0) {
    return (
      <>
        {t.home.pendingLead} <em className="text-primary">{plural(summary.unanswered, t.home.pendingCount)}</em>{' '}
        {plural(summary.unanswered, t.home.pendingTail)}
      </>
    );
  }
  return <>{summary.total === 0 ? t.home.noReviewsYet : t.home.allAnswered}</>;
}

function NextInLine({
  business,
  pending,
  locations,
}: {
  business: Business;
  pending: number;
  locations: { urn: string; title: string }[];
}) {
  const queueQuery = useNextInQueue(business.urn, NEXT_IN_LINE);
  const locationTitle = (urn: string) =>
    locations.length > 1 ? locations.find((location) => location.urn === urn)?.title : undefined;

  return (
    <section className="grid content-start gap-1 lg:col-span-2">
      <SectionTitle
        action={
          <Link viewTransition to={paths.replyQueue}>
            {plural(pending, t.home.seeQueue)}
          </Link>
        }
      >
        {t.home.nextInLine}
      </SectionTitle>

      {queueQuery.isPending && (
        <div className="grid gap-4 py-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {queueQuery.isError && (
        <div className="py-4">
          <ErrorState error={queueQuery.error} onRetry={() => void queueQuery.refetch()} />
        </div>
      )}
      {queueQuery.data !== undefined && (
        <ul className="divide-y">
          {queueQuery.data.items.map((review) => (
            <QueuePreview key={review.urn} review={review} locationTitle={locationTitle(review.locationUrn)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QueuePreview({ review, locationTitle }: { review: Review; locationTitle: string | undefined }) {
  return (
    <li className="grid gap-2.5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-center gap-3">
          <ReviewerAvatar reviewer={review.reviewer} />
          <StarRating rating={review.rating} />
        </span>
        <span className="text-muted-foreground text-sm">
          {[locationTitle, formatRelativeDays(review.createdAt)].filter(Boolean).join(' · ')}
        </span>
      </div>
      <p className="font-display text-xl leading-snug sm:pl-12">
        {review.comment === undefined ? (
          <span className="text-muted-foreground italic">{t.reviews.noCommentQuote}</span>
        ) : (
          `“${review.comment}”`
        )}
      </p>
    </li>
  );
}

function RatingSection({ summary }: { summary: ReviewsSummary }) {
  const { averageRating, last30Days, previous30Days } = summary;
  const format = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });

  const trend =
    last30Days.averageRating === null || previous30Days.averageRating === null
      ? null
      : last30Days.averageRating > previous30Days.averageRating
        ? t.home.rating.trendUp
        : last30Days.averageRating < previous30Days.averageRating
          ? t.home.rating.trendDown
          : t.home.rating.trendSame;

  return (
    <section className="grid content-start gap-4">
      <SectionTitle>{t.home.rating.title}</SectionTitle>
      {averageRating === null ? (
        <p className="text-muted-foreground text-sm">{t.home.rating.none}</p>
      ) : (
        <dl className="grid gap-1">
          <dt className="sr-only">{t.home.rating.average}</dt>
          <dd className="flex items-baseline gap-3">
            <span className="font-display text-primary text-6xl leading-none tracking-[-0.02em] tabular-nums">
              {format(averageRating)}
            </span>
            <span className="text-muted-foreground text-sm">{t.home.rating.outOf}</span>
            <StarRating rating={Math.round(averageRating)} />
          </dd>
        </dl>
      )}
      <ul className="text-muted-foreground grid gap-1 text-sm">
        <li>{plural(summary.total, t.home.rating.total)}</li>
        <li>{last30Days.count === 0 ? t.home.rating.last30None : plural(last30Days.count, t.home.rating.last30)}</li>
        {trend !== null && last30Days.averageRating !== null && previous30Days.averageRating !== null && (
          <li>
            {trend
              .replace('{current}', format(last30Days.averageRating))
              .replace('{previous}', format(previous30Days.averageRating))}
          </li>
        )}
      </ul>
    </section>
  );
}

function QrSection({
  business,
  totalScans,
  hasCampaigns,
}: {
  business: Business;
  totalScans: number;
  hasCampaigns: boolean;
}) {
  const scansQuery = useScansByWeek(business.urn, null);
  const canCreate = business.role === 'OWNER' || business.role === 'ADMIN';

  return (
    <section className="grid content-start gap-4">
      <SectionTitle
        action={
          hasCampaigns ? (
            <Link viewTransition to={paths.campaigns}>
              {t.home.qr.open}
            </Link>
          ) : undefined
        }
      >
        {t.home.qr.title}
      </SectionTitle>
      {!hasCampaigns ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground text-sm">{t.home.qr.empty}</p>
          {canCreate && (
            <Button asChild variant="outline" size="sm">
              <Link viewTransition to={paths.campaigns}>
                {t.home.qr.create}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-primary text-6xl leading-none tracking-[-0.02em] tabular-nums">
              {totalScans.toLocaleString('es-AR')}
            </span>
            <span className="text-muted-foreground text-sm">{plural(totalScans, t.home.qr.total)}</span>
          </p>
          {scansQuery.data !== undefined && <ScanChart data={scansQuery.data} />}
        </>
      )}
    </section>
  );
}

function GoogleSection({
  connected,
  lastSyncAt,
  loading,
}: {
  connected: boolean;
  lastSyncAt: string | undefined;
  loading: boolean;
}) {
  if (loading) return null;

  return (
    <section className="grid content-start gap-3">
      <SectionTitle
        action={
          <Link viewTransition to={paths.google}>
            {t.home.google.manage}
          </Link>
        }
      >
        {t.home.google.title}
      </SectionTitle>
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
        <span aria-hidden className={cn('size-2 rounded-full', connected ? 'bg-primary' : 'bg-destructive')} />
        {connected ? t.google.status.ACTIVE : t.google.status.DISCONNECTED}
      </p>
      {connected && (
        <p className="text-muted-foreground text-sm">
          {lastSyncAt === undefined
            ? t.home.google.neverSynced
            : t.home.google.lastSync.replace('{when}', formatRelativeDays(lastSyncAt) ?? '')}
        </p>
      )}
    </section>
  );
}

/**
 * Lo que falta para que el producto funcione. Desaparece cuando está todo hecho. Solo el primer
 * paso pendiente tiene botón: los demás dependen de él.
 */
function SetupSteps({ steps }: { steps: { label: string; done: boolean; to: string }[] }) {
  const next = steps.findIndex((step) => !step.done);

  return (
    <section className="grid max-w-3xl gap-1">
      <SectionTitle>{t.home.setup.title}</SectionTitle>
      <p className="text-muted-foreground py-3 text-sm">{t.home.setup.description}</p>
      <ol className="divide-y border-t">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={index === next ? 'step' : undefined}
            className="flex min-h-16 flex-wrap items-center gap-4 py-3"
          >
            <span
              aria-hidden
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                step.done && 'bg-brand-soft border-brand/30 text-brand-strong',
                index === next && 'bg-primary text-primary-foreground border-transparent',
                !step.done && index !== next && 'text-muted-foreground bg-card',
              )}
            >
              {step.done ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span className={cn('flex-1', step.done ? 'text-muted-foreground' : 'font-medium')}>
              {step.label}
              {step.done && <span className="sr-only"> {t.home.setup.done}</span>}
            </span>
            {index === next && (
              <Button asChild size="sm">
                <Link viewTransition to={step.to}>
                  {t.home.setup.next}
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
