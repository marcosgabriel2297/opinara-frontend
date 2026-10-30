import { ChevronRightIcon, PlusIcon, QrCodeIcon } from 'lucide-react';
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
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { useLocations } from '@/features/locations/queries';
import { t } from '@/i18n';

import { CampaignStatsRow } from '../components/campaign-stats';
import { CreateCampaignForm } from '../components/create-campaign-form';
import { useCampaigns } from '../queries';

export default function CampaignsRoute() {
  const business = useCurrentBusiness();
  const campaignsQuery = useCampaigns(business.urn);
  const locationsQuery = useLocations(business.urn);
  const [creating, setCreating] = useState(false);

  const locations = locationsQuery.data ?? [];
  const canCreate = business.role === 'OWNER' || business.role === 'ADMIN';

  if (campaignsQuery.isPending || locationsQuery.isPending) {
    return (
      <>
        <PageHeader title={t.campaigns.title} description={t.campaigns.subtitle} />
        <Spinner label={t.common.loading} />
        <Skeleton className="mt-4 h-40 w-full max-w-4xl" />
      </>
    );
  }
  if (campaignsQuery.isError) {
    return <ErrorState error={campaignsQuery.error} onRetry={() => void campaignsQuery.refetch()} />;
  }

  const campaigns = campaignsQuery.data;
  // `undefined` si la sucursal ya no está: nunca se muestra el URN crudo como si fuera un nombre.
  const locationTitle = (locationUrn: string) => locations.find((location) => location.urn === locationUrn)?.title;

  if (locations.length === 0) {
    return (
      <>
        <PageHeader title={t.campaigns.title} />
        <EmptyState
          icon={<QrCodeIcon aria-hidden />}
          title={t.campaigns.empty.noLocations}
          description={t.campaigns.empty.noLocationsBody}
          action={
            canCreate ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link viewTransition to={paths.newLocation}>
                    {t.campaigns.empty.noLocationsAction}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link viewTransition to={paths.google}>
                    {t.campaigns.empty.noLocationsGoogle}
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.campaigns.title}
        description={t.campaigns.subtitle}
        actions={
          // Con la lista vacía el estado vacío ya ofrece crear: dos botones iguales a la vez
          // no ayudan a nadie.
          canCreate && !creating && campaigns.length > 0 ? (
            <Button
              onClick={() => {
                setCreating(true);
              }}
            >
              <PlusIcon aria-hidden />
              {t.campaigns.create}
            </Button>
          ) : undefined
        }
      />

      <div className="grid max-w-4xl gap-6">
        {creating && (
          <CreateCampaignForm
            businessUrn={business.urn}
            businessName={business.name}
            businessSlug={business.slug}
            locations={locations}
            onCancel={() => {
              setCreating(false);
            }}
          />
        )}

        {campaigns.length === 0 && !creating && (
          <EmptyState
            icon={<QrCodeIcon aria-hidden />}
            title={t.campaigns.empty.title}
            description={canCreate ? t.campaigns.empty.body : t.campaigns.empty.memberBody}
            action={
              canCreate ? (
                <Button
                  onClick={() => {
                    setCreating(true);
                  }}
                >
                  {t.campaigns.create}
                </Button>
              ) : undefined
            }
          />
        )}

        {campaigns.length > 0 && (
          // Una fila por campaña en una sola superficie: nombre y sucursal, estado y escaneos en
          // columnas que se comparan de un vistazo. Toda la fila lleva al detalle (el link se
          // estira con `after:`), pero sigue habiendo un solo link, con el nombre como texto.
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {campaigns.map((campaign) => (
                <li
                  key={campaign.urn}
                  className="hover:bg-accent/60 relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 transition-[background-color] first:rounded-t-lg last:rounded-b-lg sm:grid-cols-[minmax(0,1fr)_7rem_6rem_1rem] sm:px-5"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <Link
                      viewTransition
                      to={paths.campaign(campaign.urn)}
                      className="truncate font-medium underline-offset-4 after:absolute after:inset-0 after:rounded-lg hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    {locationTitle(campaign.locationUrn) === undefined ? (
                      <p className="text-destructive text-sm">{t.campaigns.locationMissing}</p>
                    ) : (
                      <p className="text-muted-foreground truncate text-sm">{locationTitle(campaign.locationUrn)}</p>
                    )}
                  </div>

                  <Badge
                    variant={campaign.status === 'ACTIVE' ? 'success' : 'outline'}
                    className="justify-self-end sm:justify-self-start"
                  >
                    {t.campaigns.status[campaign.status]}
                  </Badge>

                  <CampaignStatsRow campaign={campaign} className="col-span-2 sm:col-span-1 sm:text-right" />

                  <ChevronRightIcon aria-hidden className="text-muted-foreground hidden size-4 sm:block" />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
