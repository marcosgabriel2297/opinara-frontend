import { AlertTriangleIcon } from 'lucide-react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage, t } from '@/i18n';

import { needsGoogleReconnect } from '../reconnect';

/**
 * Error de una pantalla que depende de Google.
 *
 * Si lo que se rompió es la conexión, ofrecer "Reintentar" es mentirle al usuario: el mismo
 * request va a fallar igual. En ese caso lo mandamos a reconectar.
 */
export function GoogleErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (needsGoogleReconnect(error)) return <GoogleReconnectAlert error={error} />;

  return <ErrorState error={error} onRetry={onRetry} />;
}

/** El aviso con el link a reconectar. También lo usan las acciones que fallan por la conexión. */
export function GoogleReconnectAlert({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>{t.google.revokedBanner.title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>{errorMessage(error)}</p>
        <Button asChild size="sm" variant="destructive">
          <Link viewTransition to={paths.google}>
            {t.google.status.reconnect}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
