import { AlertTriangleIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { t } from '@/i18n';

import { useGoogleConnection } from '../queries';

/**
 * Aviso persistente arriba del dashboard.
 *
 * `REVOKED` se muestra siempre y no se puede cerrar: mientras esté así no entran reseñas nuevas,
 * y enterarse tarde es el peor resultado posible para el negocio.
 */
export function ConnectionBanner() {
  const business = useCurrentBusiness();
  const location = useLocation();
  const connectionQuery = useGoogleConnection(business.urn);

  // En las pantallas de Google y en Configuración sería ruido: ahí la tarjeta de la conexión ya
  // muestra el estado y la misma acción (dos botones iguales uno arriba del otro).
  if (location.pathname.startsWith(paths.google) || location.pathname === paths.settings) return null;
  if (connectionQuery.isPending || connectionQuery.isError) return null;

  const connection = connectionQuery.data;
  const revoked = connection?.status === 'REVOKED';
  const missing = connection === null || connection.status === 'DISCONNECTED';

  if (!revoked && !missing) return null;

  const copy = revoked ? t.google.revokedBanner : t.google.missingBanner;

  return (
    <Alert variant={revoked ? 'destructive' : 'warning'} className="mb-6">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>{copy.description}</p>
        <Button asChild size="sm" variant={revoked ? 'destructive' : 'default'}>
          <Link viewTransition to={paths.google}>
            {revoked ? t.google.status.reconnect : t.google.missingBanner.action}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
