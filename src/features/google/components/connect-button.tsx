import { useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage, t } from '@/i18n';
import { browser } from '@/lib/browser';

import { rememberPendingConnection } from '../pending-connection';
import { useStartConnection } from '../queries';

interface ConnectButtonProps {
  businessUrn: string;
  /** Solo OWNER puede conectar: el backend lo exige y la UI no debería ofrecerlo si no. */
  canConnect: boolean;
  label?: string;
}

export function ConnectButton({ businessUrn, canConnect, label }: ConnectButtonProps) {
  const startConnection = useStartConnection(businessUrn);
  const [error, setError] = useState<unknown>(null);
  // Si falla, el foco va al aviso: el botón no se movió, pero así el error se lee y no se pierde.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error !== null) errorRef.current?.focus();
  }, [error]);

  if (!canConnect) {
    return (
      <Alert>
        <AlertDescription>{t.google.connect.ownerOnly}</AlertDescription>
      </Alert>
    );
  }

  const connect = () => {
    if (startConnection.isPending) return;
    setError(null);
    startConnection.mutate(undefined, {
      onSuccess: ({ authorizationUrl }) => {
        // El callback del backend vuelve a una URL fija que no dice de qué negocio se trata.
        rememberPendingConnection(businessUrn);
        browser.redirectTo(authorizationUrl);
      },
      onError: (cause: unknown) => {
        setError(cause);
      },
    });
  };

  return (
    <div className="grid gap-3">
      {error !== null && (
        <Alert ref={errorRef} variant="destructive" tabIndex={-1}>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {/* `aria-disabled` y no `disabled`: un botón deshabilitado pierde el foco. */}
      <Button onClick={connect} aria-disabled={startConnection.isPending} className="w-fit aria-disabled:opacity-50">
        {startConnection.isPending ? t.google.connect.connecting : (label ?? t.google.connect.action)}
      </Button>
    </div>
  );
}
