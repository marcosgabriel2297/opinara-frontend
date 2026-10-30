import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { useLocations } from '@/features/locations/queries';
import { plural, t } from '@/i18n';

import { canImportLocations } from '../permissions';
import { ConnectionStatusCard } from '../components/connection-status-card';
import { ALL_STEPS_DONE, Steps } from '../components/steps';
import { useGoogleConnection } from '../queries';

/** Hub de la conexión con Google: estado actual y, si hace falta, el paso siguiente. */
export default function GoogleRoute() {
  const business = useCurrentBusiness();
  const connectionQuery = useGoogleConnection(business.urn);
  const locationsQuery = useLocations(business.urn);

  // Sin respuesta (cargando o con error) no se sabe si está conectada: no se infiere nada.
  const known = connectionQuery.isSuccess;
  const connected = known && connectionQuery.data?.status === 'ACTIVE';
  // Con la conexión activa, el paso depende de las sucursales: tampoco se adivina sin ellas.
  const importedCount = locationsQuery.isSuccess ? locationsQuery.data.length : null;
  const step = !known ? null : !connected ? 1 : importedCount === null ? null : importedCount > 0 ? ALL_STEPS_DONE : 2;

  return (
    <>
      <PageHeader title={t.google.title} back={{ to: paths.settings, label: t.google.backToSettings }} />

      {/* Con sucursales importadas los tres pasos están hechos: ninguno queda "en curso". */}
      {step !== null && <Steps current={step} />}

      <div className="grid max-w-3xl gap-6">
        <ConnectionStatusCard business={business} />

        {connected && importedCount !== null && (
          <NextStepCard importedCount={importedCount} canImport={canImportLocations(business.role)} />
        )}
        {connected && locationsQuery.isError && (
          <ErrorState error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />
        )}
      </div>
    </>
  );
}

function NextStepCard({ importedCount, canImport }: { importedCount: number; canImport: boolean }) {
  const done = importedCount > 0;

  // Sin permiso para importar y sin nada importado no hay paso que ofrecer: solo se explica.
  if (!done && !canImport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.google.accounts.title}</CardTitle>
          <CardDescription>{t.google.locations.readOnly}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{done ? t.google.done.title : t.google.accounts.title}</CardTitle>
        <CardDescription>
          {done ? plural(importedCount, t.google.done.description) : t.google.accounts.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {canImport && (
          <Button asChild>
            <Link viewTransition to={paths.googleAccounts}>
              {done ? t.google.done.importMore : t.google.accounts.choose}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        )}
        {done && (
          <Button asChild variant={canImport ? 'outline' : 'default'}>
            <Link viewTransition to={paths.reviews}>
              {t.google.done.goToReviews}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
