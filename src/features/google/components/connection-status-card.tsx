import { useEffect, useRef, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { type Business } from '@/features/businesses/api/schemas';
import { errorMessage, t } from '@/i18n';
import { formatDate } from '@/lib/format';

import { useDisconnect, useGoogleConnection } from '../queries';
import { ConnectButton } from './connect-button';

/**
 * La conexión con Google y lo que se puede hacer con ella. Una sola tarjeta por estado:
 * - cargando o con error: no afirma nada sobre la conexión (no se sabe);
 * - sin conexión: qué permiso se va a pedir y el botón para conectar;
 * - revocada: qué pasó y el botón para reconectar;
 * - activa: desde cuándo y, para el dueño, desconectar.
 */
export function ConnectionStatusCard({ business }: { business: Business }) {
  const connectionQuery = useGoogleConnection(business.urn);
  const disconnectMutation = useDisconnect(business.urn);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const isOwner = business.role === 'OWNER';

  // El foco sigue a la acción: a la confirmación al abrirla, al botón que la abrió al cancelar,
  // y al resultado al terminar. Sin esto, el botón que se desmonta (o se deshabilita) lo tira al body.
  const disconnectRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (confirmingDisconnect) cancelRef.current?.focus();
    else if (returnFocus.current) disconnectRef.current?.focus();
    returnFocus.current = false;
  }, [confirmingDisconnect]);

  const disconnectResult = disconnectMutation.isSuccess ? 'done' : disconnectMutation.isError ? 'error' : null;
  useEffect(() => {
    if (disconnectResult !== null) resultRef.current?.focus();
  }, [disconnectResult]);

  if (connectionQuery.isPending) {
    return (
      <Card>
        <CardContent>
          <Spinner label={t.common.loading} />
        </CardContent>
      </Card>
    );
  }

  if (connectionQuery.isError) {
    return <ErrorState error={connectionQuery.error} onRetry={() => void connectionQuery.refetch()} />;
  }

  const connection = connectionQuery.data;

  if (connection === null || connection.status === 'DISCONNECTED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.google.connect.title}</CardTitle>
          <CardDescription>{t.google.connect.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {disconnectResult === 'done' && (
            <Alert ref={resultRef} variant="success" role="status" tabIndex={-1}>
              <AlertDescription>{t.google.status.disconnected}</AlertDescription>
            </Alert>
          )}
          <ConnectButton businessUrn={business.urn} canConnect={isOwner} />
        </CardContent>
      </Card>
    );
  }

  if (connection.status === 'REVOKED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.google.status.title}</CardTitle>
          <CardDescription className="grid justify-items-start gap-2">
            <Badge variant="destructive">{t.google.status.REVOKED}</Badge>
            {t.google.status.revokedDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectButton businessUrn={business.urn} canConnect={isOwner} label={t.google.status.reconnect} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.google.status.title}</CardTitle>
        <CardDescription>
          <Badge variant="success">{t.google.status.ACTIVE}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.google.status.connectedAt}</dt>
            <dd className="font-medium">{formatDate(connection.connectedAt)}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.google.status.lastSync}</dt>
            <dd className="font-medium">{formatDate(connection.lastSyncAt) ?? t.google.status.never}</dd>
          </div>
        </dl>

        {isOwner && (
          <div className="grid gap-2 border-t pt-4">
            {confirmingDisconnect ? (
              <div
                role="group"
                aria-labelledby="disconnect-confirm"
                className="bg-destructive-soft border-destructive/30 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
              >
                <p id="disconnect-confirm" className="mr-auto text-sm">
                  {t.google.status.disconnectConfirm}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="aria-disabled:opacity-50"
                  // `aria-disabled` y no `disabled`: un botón deshabilitado pierde el foco.
                  aria-disabled={disconnectMutation.isPending}
                  onClick={() => {
                    if (!disconnectMutation.isPending) disconnectMutation.mutate();
                  }}
                >
                  {disconnectMutation.isPending ? t.google.status.disconnecting : t.google.status.disconnect}
                </Button>
                <Button
                  ref={cancelRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    returnFocus.current = true;
                    disconnectMutation.reset();
                    setConfirmingDisconnect(false);
                  }}
                >
                  {t.common.cancel}
                </Button>
              </div>
            ) : (
              <Button
                ref={disconnectRef}
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setConfirmingDisconnect(true);
                }}
              >
                {t.google.status.disconnect}
              </Button>
            )}

            {disconnectMutation.isError && (
              <p ref={resultRef} role="alert" tabIndex={-1} className="text-destructive text-sm">
                {errorMessage(disconnectMutation.error)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
