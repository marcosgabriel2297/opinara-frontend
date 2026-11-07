import { ChevronRightIcon, PlusIcon, ScanLineIcon, StampIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { hasFeature } from '@/features/businesses/api/schemas';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { useLocations } from '@/features/locations/queries';
import { t } from '@/i18n';

import { CreateProgramForm } from '../components/create-program-form';
import { LoyaltyUpsell } from '../components/loyalty-upsell';
import { usePrograms } from '../queries';

/** Las tarjetas de sellos del negocio, una por sucursal, y la entrada a la caja. */
export default function LoyaltyRoute() {
  const business = useCurrentBusiness();
  const included = hasFeature(business, 'LOYALTY');
  const programsQuery = usePrograms(business.urn, included);
  const locationsQuery = useLocations(business.urn);
  const [creating, setCreating] = useState(false);

  if (!included) {
    return (
      <>
        <PageHeader title={t.loyalty.title} description={t.loyalty.subtitle} />
        <LoyaltyUpsell />
      </>
    );
  }

  if (programsQuery.isPending || locationsQuery.isPending) {
    return (
      <>
        <PageHeader title={t.loyalty.title} description={t.loyalty.subtitle} />
        <Spinner label={t.common.loading} />
        <Skeleton className="mt-4 h-40 w-full max-w-4xl" />
      </>
    );
  }
  if (programsQuery.isError) {
    return <ErrorState error={programsQuery.error} onRetry={() => void programsQuery.refetch()} />;
  }
  if (locationsQuery.isError) {
    return <ErrorState error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />;
  }

  const programs = programsQuery.data;
  const canManage = business.role === 'OWNER' || business.role === 'ADMIN';
  const withProgram = new Set(programs.map((program) => program.location.urn));
  const available = locationsQuery.data.filter((location) => location.isActive && !withProgram.has(location.urn));
  const startCreating = () => {
    setCreating(true);
  };

  if (locationsQuery.data.length === 0) {
    return (
      <>
        <PageHeader title={t.loyalty.title} description={t.loyalty.subtitle} />
        <EmptyState
          icon={<StampIcon aria-hidden />}
          title={t.loyalty.empty.noLocations}
          description={t.loyalty.empty.noLocationsBody}
          action={
            canManage ? (
              <Button asChild>
                <Link viewTransition to={paths.newLocation}>
                  {t.loyalty.empty.noLocationsAction}
                </Link>
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.loyalty.title}
        description={t.loyalty.subtitle}
        actions={
          <>
            {programs.length > 0 && (
              // La acción de todos los días: la más visible.
              <Button asChild>
                <Link to={paths.loyaltyRegister}>
                  <ScanLineIcon aria-hidden />
                  {t.loyalty.openRegister}
                </Link>
              </Button>
            )}
            {canManage && !creating && programs.length > 0 && available.length > 0 && (
              <Button variant="outline" onClick={startCreating}>
                <PlusIcon aria-hidden />
                {t.loyalty.create}
              </Button>
            )}
          </>
        }
      />

      <div className="grid max-w-4xl gap-6">
        {creating && (
          <CreateProgramForm
            businessUrn={business.urn}
            locations={available}
            onCancel={() => {
              setCreating(false);
            }}
          />
        )}

        {programs.length === 0 && !creating && (
          <EmptyState
            icon={<StampIcon aria-hidden />}
            title={t.loyalty.empty.title}
            description={canManage ? t.loyalty.empty.body : t.loyalty.empty.memberBody}
            action={
              canManage && available.length > 0 ? (
                <Button onClick={startCreating}>{t.loyalty.create}</Button>
              ) : undefined
            }
          />
        )}

        {programs.length > 0 && (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {programs.map((program) => (
                <li
                  key={program.urn}
                  className="hover:bg-accent/60 relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-[background-color] first:rounded-t-lg last:rounded-b-lg sm:grid-cols-[minmax(0,1fr)_6rem_auto_1rem] sm:px-5"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <Link
                      viewTransition
                      to={paths.loyaltyProgram(program.urn)}
                      className="truncate font-medium underline-offset-4 after:absolute after:inset-0 after:rounded-lg hover:underline"
                    >
                      {program.location.title}
                    </Link>
                    <p className="text-muted-foreground truncate text-sm">
                      {t.loyalty.rewardLine
                        .replace('{count}', String(program.stampsRequired))
                        .replace('{reward}', program.rewardDescription)}
                    </p>
                  </div>
                  <Badge
                    variant={program.status === 'ACTIVE' ? 'success' : 'outline'}
                    className="justify-self-end sm:justify-self-start"
                  >
                    {t.loyalty.status[program.status]}
                  </Badge>
                  <dl className="col-span-2 flex gap-5 text-sm sm:col-span-1 sm:justify-end">
                    {(['members', 'stamps', 'redemptions'] as const).map((stat) => (
                      <div key={stat} className="grid">
                        <dt className="text-muted-foreground text-xs">{t.loyalty.stats[stat]}</dt>
                        <dd className="font-semibold tabular-nums">{program.stats[stat]}</dd>
                      </div>
                    ))}
                  </dl>
                  <ChevronRightIcon aria-hidden className="text-muted-foreground hidden size-4 sm:block" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {canManage && programs.length > 0 && available.length === 0 && (
          <p className="text-muted-foreground text-sm">{t.loyalty.allLocationsHaveProgram}</p>
        )}
      </div>
    </>
  );
}
