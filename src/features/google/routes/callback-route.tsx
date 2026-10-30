import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2Icon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBusinesses } from '@/features/businesses/use-business';
import { errorMessages, fallbackErrorMessage, t } from '@/i18n';
import { queryKeys } from '@/lib/query-keys';

import { ConnectButton } from '../components/connect-button';
import { Steps } from '../components/steps';
import { clearPendingConnection, readPendingConnection } from '../pending-connection';
import { useGoogleConnection } from '../queries';

/**
 * Vuelta del consentimiento de Google.
 *
 * El backend redirige siempre a esta misma URL y **no manda el negocio**: solo agrega
 * `?error=CODE` si algo falló. Por eso el negocio se recupera de `sessionStorage`, donde lo
 * dejamos antes de mandar al usuario a Google.
 */
export default function GoogleCallbackRoute() {
  const [searchParams] = useSearchParams();
  const { businesses, current, select } = useBusinesses();
  const queryClient = useQueryClient();
  const restored = useRef(false);

  const errorCode = searchParams.get('error');

  // Si volvió sobre un negocio distinto del seleccionado, lo dejamos parado en el correcto.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const pending = readPendingConnection();
    clearPendingConnection();

    if (pending === null || pending === current?.urn) return;
    if (businesses.some((business) => business.urn === pending)) select(pending);
  }, [businesses, current, select]);

  const businessUrn = current?.urn ?? '';
  const connectionQuery = useGoogleConnection(businessUrn);

  // La conexión cambió del lado del backend mientras estábamos en Google: lo cacheado quedó viejo.
  useEffect(() => {
    if (errorCode !== null || businessUrn === '') return;

    void queryClient.invalidateQueries({ queryKey: queryKeys.googleConnection(businessUrn) });
  }, [errorCode, businessUrn, queryClient]);

  if (errorCode !== null) {
    return (
      <div className="grid max-w-3xl gap-6">
        <PageHeader title={t.google.callback.errorTitle} className="mb-0" />
        <Alert variant="destructive">
          <AlertDescription>{callbackErrorMessage(errorCode)}</AlertDescription>
        </Alert>
        {current !== null && (
          <ConnectButton
            businessUrn={current.urn}
            canConnect={current.role === 'OWNER'}
            label={t.google.callback.retry}
          />
        )}
      </div>
    );
  }

  const connected = connectionQuery.data?.status === 'ACTIVE';

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title={t.google.title} className="mb-0" />
      {/* Hasta saber cómo quedó la conexión no se marca ningún paso. */}
      {connectionQuery.isSuccess && <Steps current={connected ? 2 : 1} />}

      {connectionQuery.isPending && <Spinner label={t.google.callback.resolving} />}

      {connected && (
        <>
          <Alert variant="success">
            <CheckCircle2Icon aria-hidden />
            <AlertTitle>{t.google.callback.successTitle}</AlertTitle>
            <AlertDescription>{t.google.callback.successBody}</AlertDescription>
          </Alert>

          <Button asChild className="w-fit">
            <Link viewTransition to={paths.googleAccounts}>
              {t.google.callback.continue}
            </Link>
          </Button>
        </>
      )}

      {connectionQuery.isSuccess && !connected && (
        <>
          <Alert variant="warning">
            <AlertDescription>{t.google.status.notConnected}</AlertDescription>
          </Alert>
          {current !== null && (
            <ConnectButton
              businessUrn={current.urn}
              canConnect={current.role === 'OWNER'}
              label={t.google.callback.retry}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Al callback, el backend solo le pasa `GOOGLE_PERMISSION_DENIED` cuando Google vuelve con
 * `?error=` en vez del permiso: se canceló, no se aceptaron los permisos o Google lo rechazó. No se
 * sabe cuál, así que el texto no culpa a nadie. En el resto de la app ese código significa otra
 * cosa (Google negó un recurso), por eso el mensaje global no se toca.
 */
function callbackErrorMessage(errorCode: string): string {
  if (errorCode === 'GOOGLE_PERMISSION_DENIED') return t.google.callback.permissionNotGranted;
  return errorMessages[errorCode] ?? fallbackErrorMessage;
}
