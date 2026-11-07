import { ScanLineIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { BackLink, PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { hasFeature } from '@/features/businesses/api/schemas';
import { logoUrl } from '@/features/businesses/logo';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { QrActions } from '@/features/campaigns/components/qr-actions';
import { QrSheet, type SheetCopy } from '@/features/campaigns/components/qr-sheet';
import { branchLabel } from '@/features/campaigns/destination';
import { type QrFormat } from '@/features/campaigns/qr-formats';
import { t } from '@/i18n';

import { LoyaltyUpsell } from '../components/loyalty-upsell';
import { ProgramMembers } from '../components/program-members';
import { ProgramSettings } from '../components/program-settings';
import { type LoyaltyProgram } from '../api/schemas';
import { useProgram, useProgramQr } from '../queries';

/**
 * La tarjeta de una sucursal: el QR para imprimir primero (es lo que se viene a buscar al crearla),
 * después la configuración y los clientes.
 */
export default function ProgramRoute() {
  const business = useCurrentBusiness();
  const { programUrn = '' } = useParams<{ programUrn: string }>();

  if (!hasFeature(business, 'LOYALTY')) {
    return (
      <>
        <PageHeader title={t.loyalty.title} back={{ to: paths.loyalty, label: t.loyalty.program.back }} />
        <LoyaltyUpsell />
      </>
    );
  }

  return <ProgramDetail businessUrn={business.urn} programUrn={programUrn} />;
}

function ProgramDetail({ businessUrn, programUrn }: { businessUrn: string; programUrn: string }) {
  const business = useCurrentBusiness();
  const programQuery = useProgram(businessUrn, programUrn);
  const program = programQuery.data;
  const canManage = business.role === 'OWNER' || business.role === 'ADMIN';

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <BackLink to={paths.loyalty} label={t.loyalty.program.back} />
        {programQuery.isPending && (
          <>
            <Spinner label={t.common.loading} />
            <Skeleton className="h-7 w-48" />
          </>
        )}
        {program !== undefined && (
          <PageHeader
            className="no-imprimir mb-0"
            title={program.location.title}
            description={
              <span className="inline-flex flex-wrap items-center gap-2">
                {t.loyalty.rewardLine
                  .replace('{count}', String(program.stampsRequired))
                  .replace('{reward}', program.rewardDescription)}
                <Badge variant={program.status === 'ACTIVE' ? 'success' : 'outline'}>
                  {t.loyalty.status[program.status]}
                </Badge>
              </span>
            }
            actions={
              <Button asChild>
                <Link to={paths.loyaltyRegister}>
                  <ScanLineIcon aria-hidden />
                  {t.loyalty.openRegister}
                </Link>
              </Button>
            }
          />
        )}
      </div>

      {programQuery.isError && <ErrorState error={programQuery.error} onRetry={() => void programQuery.refetch()} />}

      {program !== undefined && (
        <>
          {program.status === 'PAUSED' && (
            <Alert variant="warning" className="no-imprimir">
              <AlertDescription>{t.loyalty.program.paused}</AlertDescription>
            </Alert>
          )}
          {!program.location.isActive && (
            <Alert variant="warning" className="no-imprimir">
              <AlertDescription>{t.loyalty.program.locationInactive}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <ProgramQr program={program} canManage={canManage} />

            <div className="no-imprimir grid gap-6">
              <Card>
                <CardContent>
                  <dl className="flex flex-wrap gap-8">
                    {(['members', 'stamps', 'redemptions'] as const).map((stat) => (
                      <div key={stat} className="grid gap-0.5">
                        <dt className="text-muted-foreground text-sm">{t.loyalty.stats[stat]}</dt>
                        <dd className="font-display text-3xl tabular-nums">{program.stats[stat]}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              {canManage && <ProgramSettings key={program.urn} businessUrn={businessUrn} program={program} />}
            </div>
          </div>

          <div className="no-imprimir">
            <ProgramMembers businessUrn={businessUrn} program={program} canManage={canManage} />
          </div>
        </>
      )}
    </div>
  );
}

/** El QR del alta con los mismos formatos de impresión que las campañas, y sus propios textos. */
function ProgramQr({ program, canManage }: { program: LoyaltyProgram; canManage: boolean }) {
  const business = useCurrentBusiness();
  const usable = program.status === 'ACTIVE' && program.location.isActive;
  const qrQuery = useProgramQr(business.urn, program.urn, canManage && usable);
  const [format, setFormat] = useState<QrFormat>('poster');
  const branch = branchLabel(business.name, program.location.title);
  const copy: SheetCopy = {
    headline: t.loyalty.program.printHeadline,
    subhead: t.loyalty.program.printSubhead,
    fallback: t.loyalty.program.printFallback,
    qrAlt: t.loyalty.program.qrAlt.replace('{location}', program.location.title),
  };

  return (
    <section aria-labelledby="loyalty-qr-title" className="grid gap-3">
      <div className="no-imprimir grid gap-1">
        <h2 id="loyalty-qr-title" className="font-semibold">
          {t.loyalty.program.qrTitle}
        </h2>
        <p className="text-muted-foreground text-sm">{t.loyalty.program.qrHint}</p>
      </div>

      {!usable ? (
        <Alert className="no-imprimir">
          <AlertDescription>{t.loyalty.program.qrUnavailable}</AlertDescription>
        </Alert>
      ) : !canManage ? (
        <Alert className="no-imprimir">
          <AlertDescription>{t.loyalty.program.ownerOnly}</AlertDescription>
        </Alert>
      ) : qrQuery.isError ? (
        <ErrorState title={t.campaigns.detail.qrError} error={qrQuery.error} onRetry={() => void qrQuery.refetch()} />
      ) : (
        <>
          <div
            aria-busy={qrQuery.data === undefined}
            className="bg-muted flex justify-center rounded-lg border p-4 sm:p-8 print:border-0 print:bg-transparent print:p-0"
          >
            <QrSheet
              businessName={business.name}
              branch={branch}
              campaignName={program.location.title}
              qr={qrQuery.data}
              logoUrl={logoUrl(business)}
              format={format}
              copy={copy}
            />
          </div>
          {qrQuery.data !== undefined && (
            <Card className="no-imprimir">
              <CardHeader>
                <CardTitle asChild>
                  <h3>{t.campaigns.detail.studioTitle}</h3>
                </CardTitle>
                <CardDescription>{t.loyalty.program.qrHint}</CardDescription>
              </CardHeader>
              <CardContent>
                <QrActions
                  qr={qrQuery.data}
                  businessName={business.name}
                  businessSlug={business.slug}
                  logoUrl={logoUrl(business)}
                  branch={branch}
                  campaignSlug={`sellos-${program.slug}`}
                  format={format}
                  onFormatChange={setFormat}
                  copy={copy}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
