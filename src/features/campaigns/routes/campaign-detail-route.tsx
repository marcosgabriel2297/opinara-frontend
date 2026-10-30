import { useState } from 'react';
import { useParams } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { BackLink, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { logoUrl } from '@/features/businesses/logo';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { useLocations } from '@/features/locations/queries';
import { t } from '@/i18n';

import { CampaignStatsRow } from '../components/campaign-stats';
import { DestinationCard, LocalUrlWarning } from '../components/destination-card';
import { QrActions } from '../components/qr-actions';
import { QrPanel } from '../components/qr-panel';
import { type QrFormat } from '../qr-formats';
import { ScanChart } from '../components/scan-chart';
import { branchLabel, resolveDestination } from '../destination';
import { useCampaign, useCampaignQr, useScansByWeek } from '../queries';

/**
 * Detalle de una campaña: lo que se viene a buscar es el QR, así que va primero (en el teléfono, el
 * QR y "Imprimir" entran en la primera pantalla); después a dónde lleva y los escaneos.
 *
 * El QR se pide solo: al abrir, para OWNER/ADMIN y únicamente si la campaña tiene un destino válido
 * (ver `resolveDestination`). Si las sucursales no cargan no hay forma de confirmarlo, así que
 * tampoco se pide.
 */
export default function CampaignDetailRoute() {
  const business = useCurrentBusiness();
  const { campaignUrn = '' } = useParams<{ campaignUrn: string }>();

  const campaignQuery = useCampaign(business.urn, campaignUrn);
  const locationsQuery = useLocations(business.urn);

  const campaign = campaignQuery.data;
  const destination =
    campaign !== undefined && locationsQuery.data !== undefined
      ? resolveDestination(campaign, locationsQuery.data)
      : undefined;
  const canGenerate = business.role === 'OWNER' || business.role === 'ADMIN';
  const qrQuery = useCampaignQr(business.urn, campaignUrn, canGenerate && destination?.ok === true);
  const scansQuery = useScansByWeek(business.urn, campaign === undefined ? null : campaign.urn);
  const [format, setFormat] = useState<QrFormat>('poster');

  const location = destination?.location;
  const branch = location === undefined ? null : branchLabel(business.name, location.title);

  return (
    <div className="grid gap-6">
      {/* El regreso queda montado siempre: si se reemplazara al llegar los datos, un clic justo en
          ese momento se perdería. */}
      <div className="grid gap-3">
        <BackLink to={paths.campaigns} label={t.campaigns.detail.back} />
        {campaignQuery.isPending && (
          <>
            <Spinner label={t.common.loading} />
            <Skeleton className="h-7 w-48" />
          </>
        )}
        {campaign !== undefined && (
          <PageHeader
            className="no-imprimir mb-0"
            title={campaign.name}
            description={
              <span className="inline-flex flex-wrap items-center gap-2">
                {locationsQuery.isSuccess && (location?.title ?? t.campaigns.locationMissing)}
                <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'outline'}>
                  {t.campaigns.status[campaign.status]}
                </Badge>
              </span>
            }
          />
        )}
      </div>

      {campaignQuery.isError && <ErrorState error={campaignQuery.error} onRetry={() => void campaignQuery.refetch()} />}

      {campaign !== undefined && (
        <>
          {locationsQuery.isPending && <Spinner label={t.common.loading} />}

          {/* Sin sucursales no se puede confirmar el destino: ni QR ni hoja, solo reintentar. */}
          {locationsQuery.isError && (
            <ErrorState
              title={t.campaigns.detail.destination.unknownTitle}
              error={locationsQuery.error}
              onRetry={() => void locationsQuery.refetch()}
            />
          )}

          {destination !== undefined && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
              <QrPanel
                business={business}
                campaign={campaign}
                destination={destination}
                branch={branch}
                canGenerate={canGenerate}
                format={format}
                qr={{
                  data: qrQuery.data,
                  isError: qrQuery.isError,
                  error: qrQuery.error,
                  retry: () => void qrQuery.refetch(),
                }}
              />

              <div className="grid gap-6">
                {/* Solo si hay un QR para imprimir: en un estado bloqueado o para MEMBER es ruido. */}
                {destination.ok && canGenerate && (
                  <LocalUrlWarning targetUrl={qrQuery.data?.targetUrl ?? campaign.targetUrl} />
                )}

                {destination.ok && qrQuery.data !== undefined && (
                  <Card className="no-imprimir">
                    <CardHeader>
                      <CardTitle asChild>
                        <h2>{t.campaigns.detail.studioTitle}</h2>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QrActions
                        qr={qrQuery.data}
                        businessName={business.name}
                        businessSlug={business.slug}
                        logoUrl={logoUrl(business)}
                        branch={branch}
                        campaignSlug={campaign.slug}
                        format={format}
                        onFormatChange={setFormat}
                      />
                    </CardContent>
                  </Card>
                )}

                <Card className="no-imprimir">
                  <CardContent className="grid gap-5">
                    <CampaignStatsRow campaign={campaign} showHint />
                    {scansQuery.data !== undefined && (
                      <div className="grid gap-3 border-t pt-4">
                        <h2 className="text-sm font-semibold">{t.campaigns.detail.scansTitle}</h2>
                        <ScanChart data={scansQuery.data} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DestinationCard
                  businessName={business.name}
                  destination={destination}
                  targetUrl={qrQuery.data?.targetUrl ?? campaign.targetUrl}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
