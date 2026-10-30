import { AlertTriangleIcon } from 'lucide-react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type Business } from '@/features/businesses/api/schemas';
import { logoUrl } from '@/features/businesses/logo';
import { t } from '@/i18n';

import { type Campaign, type GeneratedQr } from '../api/schemas';
import { type Destination, type DestinationProblem } from '../destination';
import { type QrFormat } from '../qr-formats';
import { QrSheet } from './qr-sheet';

interface QrPanelProps {
  business: Business;
  campaign: Campaign;
  destination: Destination;
  branch: string | null;
  canGenerate: boolean;
  qr: { data: GeneratedQr | undefined; isError: boolean; error: unknown; retry: () => void };
  format: QrFormat;
}

/**
 * El QR de la campaña, o por qué no está.
 *
 * El orden de las condiciones importa: primero el destino (si no lleva a Google no se genera, ni
 * para nadie), después el permiso (solo OWNER/ADMIN lo piden), después la carga.
 */
export function QrPanel({ business, campaign, destination, branch, canGenerate, qr, format }: QrPanelProps) {
  return (
    <section aria-labelledby="qr-title" className="grid gap-3">
      <h2 id="qr-title" className="sr-only">
        {t.campaigns.detail.qrTitle}
      </h2>

      {!destination.ok ? (
        <BlockedNotice problem={destination.problem} locationTitle={destination.location?.title} />
      ) : !canGenerate ? (
        <Alert>
          <AlertDescription>{t.campaigns.detail.ownerOnly}</AlertDescription>
        </Alert>
      ) : qr.isError ? (
        <ErrorState title={t.campaigns.detail.qrError} error={qr.error} onRetry={qr.retry} />
      ) : (
        // La hoja sobre una "mesa" gris: se lee como papel, que es lo que va a ser. Al imprimir solo
        // sale la hoja (`.hoja-qr`); el fondo de alrededor no.
        <div
          aria-busy={qr.data === undefined}
          className="bg-muted flex justify-center rounded-lg border p-4 sm:p-8 lg:p-10 print:border-0 print:bg-transparent print:p-0"
        >
          {qr.data === undefined && <p className="sr-only">{t.campaigns.detail.preparing}</p>}
          <QrSheet
            businessName={business.name}
            branch={branch}
            campaignName={campaign.name}
            qr={qr.data}
            logoUrl={logoUrl(business)}
            format={format}
          />
        </div>
      )}
    </section>
  );
}

function BlockedNotice({ problem, locationTitle }: { problem: DestinationProblem; locationTitle: string | undefined }) {
  const copy = t.campaigns.detail.blocked[problem];
  const isLocationProblem = problem.startsWith('location-');

  return (
    <Alert variant="warning">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>{copy.title.replace('{location}', locationTitle ?? '')}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>{copy.body}</p>
        {isLocationProblem && (
          <Button asChild size="sm" variant="outline">
            <Link viewTransition to={paths.google}>
              {t.campaigns.detail.blocked.action}
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
