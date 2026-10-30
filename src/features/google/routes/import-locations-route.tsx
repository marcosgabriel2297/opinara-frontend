import { CheckCircle2Icon, MapPinIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { googleLocationsQuery, paths } from '@/app/paths';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { errorMessage, plural, t } from '@/i18n';

import { GoogleErrorState } from '../components/google-error-state';
import { ALL_STEPS_DONE, Steps } from '../components/steps';
import { canImportLocations } from '../permissions';
import { useAvailableLocations, useImportLocations } from '../queries';

/** Paso 3: elegir qué sucursales de esa cuenta administrar desde Opinara. */
export default function ImportLocationsRoute() {
  const business = useCurrentBusiness();
  const [searchParams] = useSearchParams();
  const accountName = searchParams.get(googleLocationsQuery.account);

  const locationsQuery = useAvailableLocations(business.urn, accountName);
  const importMutation = useImportLocations(business.urn);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // El miembro ve la lista para saber qué hay, pero no puede importar: el backend se lo rechaza.
  const canImport = canImportLocations(business.role);

  // Al terminar, el foco va al resultado: el botón de importar se deshabilita (o desaparece si ya
  // no queda nada por importar) y, si no, el foco caería al body.
  const resultRef = useRef<HTMLDivElement>(null);
  const result = importMutation.isSuccess ? 'done' : importMutation.isError ? 'error' : null;
  useEffect(() => {
    if (result !== null) resultRef.current?.focus();
  }, [result]);

  const locations = locationsQuery.data ?? [];
  const importable = locations.filter((location) => !location.imported);

  const toggle = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.size === importable.length ? new Set() : new Set(importable.map((location) => location.name)),
    );
  };

  const submit = () => {
    if (accountName === null || selected.size === 0 || importMutation.isPending) return;

    importMutation.mutate(
      { accountName, locationNames: [...selected] },
      {
        onSuccess: () => {
          setSelected(new Set());
        },
      },
    );
  };

  const importedCount = importMutation.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={t.google.locations.title}
        description={t.google.locations.description}
        back={{ to: paths.googleAccounts, label: t.google.locations.back }}
      />
      <Steps current={importMutation.isSuccess ? ALL_STEPS_DONE : 3} />

      <div className="grid max-w-3xl gap-4">
        {!canImport && (
          <Alert>
            <AlertDescription>{t.google.locations.readOnly}</AlertDescription>
          </Alert>
        )}

        {accountName === null && (
          <Alert variant="warning">
            <AlertDescription className="flex flex-col items-start gap-3">
              <p>{t.google.locations.noAccount}</p>
              <Button asChild size="sm">
                <Link viewTransition to={paths.googleAccounts}>
                  {t.google.accounts.title}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {importMutation.isSuccess && (
          <Alert ref={resultRef} variant="success" role="status" tabIndex={-1}>
            <CheckCircle2Icon aria-hidden />
            <AlertDescription className="grid gap-3">
              <p>{plural(importedCount, t.google.locations.imported)}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm">
                  <Link viewTransition to={paths.reviews}>
                    {t.google.done.goToReviews}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link viewTransition to={paths.google}>
                    {t.google.locations.backToGoogle}
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {importMutation.isError && (
          <Alert ref={resultRef} variant="destructive" tabIndex={-1}>
            <AlertDescription>{errorMessage(importMutation.error)}</AlertDescription>
          </Alert>
        )}

        {locationsQuery.isPending && accountName !== null && (
          <>
            <Spinner label={t.common.loading} />
            <Skeleton className="h-32 w-full" />
          </>
        )}

        {locationsQuery.isError && (
          <GoogleErrorState error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />
        )}

        {locationsQuery.isSuccess && locations.length === 0 && (
          <EmptyState title={t.google.locations.empty} icon={<MapPinIcon aria-hidden />} />
        )}

        {locations.length > 0 && (
          <Card className="gap-0 py-0">
            {canImport && importable.length > 1 && (
              <label className="bg-muted/50 flex min-h-12 items-center gap-3 rounded-t-lg border-b px-4 text-sm font-medium sm:px-5">
                <Checkbox checked={selected.size === importable.length} onChange={toggleAll} />
                {t.google.locations.selectAll}
              </label>
            )}

            <ul className="divide-y">
              {locations.map((location) => {
                const inputId = `location-${location.locationId}`;

                return (
                  <li key={location.name} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                    {canImport && (
                      <Checkbox
                        id={inputId}
                        className="mt-0.5"
                        checked={selected.has(location.name)}
                        disabled={location.imported}
                        onChange={() => {
                          toggle(location.name);
                        }}
                      />
                    )}

                    <div className="grid min-w-0 flex-1 gap-1">
                      {canImport ? (
                        <label htmlFor={inputId} className="font-medium">
                          {location.title}
                        </label>
                      ) : (
                        <p className="font-medium">{location.title}</p>
                      )}
                      {location.address !== undefined && (
                        <p className="text-muted-foreground text-sm">{location.address}</p>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {location.storeCode !== undefined && (
                          <Badge variant="outline" dot={false}>
                            {location.storeCode}
                          </Badge>
                        )}
                        {location.imported && <Badge variant="success">{t.google.locations.alreadyImported}</Badge>}
                        {/* Sin link de reseñas no se puede usar en una campaña: el backend
                            responde LOCATION_NOT_REVIEWABLE. Se avisa acá, no cuando ya eligió. */}
                        {location.newReviewUri === undefined && (
                          <Badge variant="warning">{t.google.locations.noReviewLink}</Badge>
                        )}
                      </div>
                      {/* La explicación va a la vista: en un `title` no la ve nadie con teclado o
                          en un teléfono. */}
                      {location.newReviewUri === undefined && (
                        <p className="text-muted-foreground text-sm">{t.google.locations.noReviewLinkHint}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {canImport && importable.length > 0 && (
          // Pegada abajo mientras se recorre una lista larga: el botón siempre a mano en el
          // teléfono (sobre la barra de navegación) y en escritorio.
          <div className="bg-background/95 sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[5] -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 md:-mx-6 md:px-6 lg:bottom-0">
            <Button
              onClick={submit}
              disabled={selected.size === 0}
              // Mientras importa, `aria-disabled`: con `disabled` el botón pierde el foco.
              aria-disabled={importMutation.isPending}
              className="aria-disabled:opacity-50"
            >
              {importMutation.isPending ? t.google.locations.submitting : t.google.locations.submit}
            </Button>
            {selected.size === 0 ? (
              <p className="text-muted-foreground text-sm">{t.google.locations.nothingSelected}</p>
            ) : (
              <p className="text-muted-foreground text-sm">{plural(selected.size, t.google.locations.selectedCount)}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
