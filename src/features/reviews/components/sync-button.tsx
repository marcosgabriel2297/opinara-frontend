import { AlertTriangleIcon, CheckCircle2Icon, RefreshCwIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type Business } from '@/features/businesses/api/schemas';
import { type Location } from '@/features/locations/api/schemas';
import { errorMessage, errorMessages, fallbackErrorMessage, plural, t } from '@/i18n';

import { type SyncReport } from '../api/schemas';
import { useSyncBusiness } from '../queries';

interface SyncButtonProps {
  business: Business;
  locations: Location[];
}

/**
 * Sincronización manual.
 *
 * Lo importante acá: el backend puede responder **200 con `failed > 0`**. Que algunas sucursales
 * hayan fallado no es "todo salió bien" ni "todo falló": se muestran las dos cosas, y por qué
 * falló cada una.
 */
export function SyncButton({ business, locations }: SyncButtonProps) {
  const sync = useSyncBusiness(business.urn);
  const canSync = business.role === 'OWNER' || business.role === 'ADMIN';

  if (!canSync) return null;

  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        disabled={sync.isPending}
        onClick={() => {
          sync.mutate();
        }}
        className="w-fit lg:w-full"
      >
        <RefreshCwIcon aria-hidden className={sync.isPending ? 'animate-spin' : undefined} />
        {sync.isPending ? t.reviews.sync.syncing : t.reviews.sync.action}
      </Button>

      {sync.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(sync.error)}</AlertDescription>
        </Alert>
      )}

      {sync.isSuccess && <SyncReportPanel report={sync.data} locations={locations} />}
    </div>
  );
}

function SyncReportPanel({ report, locations }: { report: SyncReport; locations: Location[] }) {
  const imported = report.results.reduce((sum, result) => sum + result.imported, 0);
  const updated = report.results.reduce((sum, result) => sum + result.updated, 0);
  const truncated = report.results.some((result) => result.truncated);

  const everythingFailed = report.succeeded === 0 && report.failed > 0;
  const somethingFailed = report.failed > 0;

  const headline = everythingFailed
    ? plural(report.locations, t.reviews.sync.noneOk)
    : somethingFailed
      ? `${t.reviews.sync.partial
          .replace('{succeeded}', String(report.succeeded))
          .replace('{locations}', String(report.locations))} ${plural(report.failed, t.reviews.sync.failed)}`
      : plural(report.locations, t.reviews.sync.allOk);

  const locationTitle = (locationUrn: string) =>
    locations.find((location) => location.urn === locationUrn)?.title ?? locationUrn;

  return (
    <Alert variant={everythingFailed ? 'destructive' : somethingFailed ? 'warning' : 'success'} role="status">
      {somethingFailed ? <AlertTriangleIcon aria-hidden /> : <CheckCircle2Icon aria-hidden />}
      <AlertTitle>{headline}</AlertTitle>
      <AlertDescription className="grid gap-2">
        {report.succeeded > 0 && (
          <p>
            {plural(imported, t.reviews.sync.importedCount)}, {plural(updated, t.reviews.sync.updatedCount)}.
          </p>
        )}

        {truncated && <p>{t.reviews.sync.truncated}</p>}

        {report.failures.length > 0 && (
          <div className="grid gap-1">
            <p className="font-medium">{t.reviews.sync.failureTitle}</p>
            <ul className="grid gap-1">
              {report.failures.map((failure) => (
                <li key={failure.locationUrn}>
                  <span className="font-medium">{locationTitle(failure.locationUrn)}</span>:{' '}
                  {errorMessages[failure.errorCode] ?? fallbackErrorMessage}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
