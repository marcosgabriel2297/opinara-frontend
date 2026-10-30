import { ArrowRightIcon, LogOutIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/use-auth';
import { LogoSettings } from '@/features/businesses/components/logo-settings';
import { TeamSettings } from '@/features/team/components/team-settings';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { type ConnectionStatus } from '@/features/google/api/schemas';
import { useGoogleConnection } from '@/features/google/queries';
import { LocationsSettings } from '@/features/locations/components/locations-settings';
import { errorMessage, t } from '@/i18n';

export default function SettingsRoute() {
  const business = useCurrentBusiness();

  return (
    <>
      <PageHeader title={t.nav.settings} />

      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle asChild className="flex flex-wrap items-center gap-2">
              <h2>
                {business.name}
                <Badge variant="outline" dot={false}>
                  {t.businesses.roles[business.role]}
                </Badge>
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* `/r/{slug}` solo no es una página (el backend no tiene ruta para el negocio): es el
                comienzo de la dirección de cada QR. Se muestra como tal, con su etiqueta. */}
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{t.businesses.qrAddress}</dt>
                <dd className="font-mono break-all">
                  {paths.publicBusiness(business.slug)}/<span className="text-muted-foreground">campaña</span>
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{t.businesses.fields.timezone}</dt>
                <dd>{business.timezone.replace(/_/g, ' ')}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <LogoSettings business={business} />

        <TeamSettings business={business} />

        <LocationsSettings business={business} />

        <GoogleConnectionSummary businessUrn={business.urn} />

        <AccountSummary />
      </div>
    </>
  );
}

/**
 * Quién está usando la app y cómo salir. "Cerrar sesión" solo aparece debajo de `lg`: en escritorio
 * ya está al pie de la columna lateral. Cerrar en todos los dispositivos, en todos los tamaños.
 */
function AccountSummary() {
  const { state, logout, logoutEverywhere } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (state.status !== 'authenticated') return null;

  const closeEverywhere = async () => {
    setError(null);
    setPending(true);
    try {
      await logoutEverywhere();
    } catch (cause) {
      setError(cause);
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.nav.account}</h2>
        </CardTitle>
        <CardDescription>
          {state.user.name} · {state.user.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(error)}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={logout} className="lg:hidden">
            <LogOutIcon aria-hidden />
            {t.nav.logout}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => void closeEverywhere()}>
            {pending ? t.nav.loggingOutEverywhere : t.nav.logoutEverywhere}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">{t.nav.logoutEverywhereHint}</p>
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT: Record<ConnectionStatus, 'success' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  REVOKED: 'destructive',
  DISCONNECTED: 'outline',
};

/**
 * La tarjeta dice lo que pasa con la conexión. Antes mostraba siempre "Vamos a pedirte permiso…",
 * también con la cuenta ya conectada. Mientras carga no afirma nada; si la consulta falla, lo dice.
 */
function GoogleConnectionSummary({ businessUrn }: { businessUrn: string }) {
  const connectionQuery = useGoogleConnection(businessUrn);
  const status = connectionQuery.data === null ? 'DISCONNECTED' : connectionQuery.data?.status;

  const description =
    status === 'ACTIVE'
      ? t.google.status.activeDescription
      : status === 'REVOKED'
        ? t.google.status.revokedDescription
        : status === 'DISCONNECTED'
          ? t.google.connect.description
          : connectionQuery.isError
            ? t.google.status.unknown
            : undefined;

  const action =
    status === 'REVOKED'
      ? t.google.status.reconnect
      : status === 'DISCONNECTED'
        ? t.google.missingBanner.action
        : t.google.status.manage;

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild className="flex flex-wrap items-center gap-2">
          <h2>
            {t.google.title}
            {status !== undefined && <Badge variant={STATUS_VARIANT[status]}>{t.google.status[status]}</Badge>}
          </h2>
        </CardTitle>
        {description !== undefined && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {/* Reconectar o conectar es lo urgente de esta pantalla; administrar, no. */}
        <Button asChild variant={status === 'ACTIVE' ? 'outline' : 'default'}>
          <Link viewTransition to={paths.google}>
            {action}
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
