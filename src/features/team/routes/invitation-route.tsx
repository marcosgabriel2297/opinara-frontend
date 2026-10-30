import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { takeHashToken } from '@/features/auth/hash-token';
import { useAuth } from '@/features/auth/use-auth';
import { writeSelectedBusiness } from '@/features/businesses/selected-business-storage';
import { errorMessage, t } from '@/i18n';
import { isApiError } from '@/lib/http';
import { queryKeys } from '@/lib/query-keys';

import { acceptInvitation, lookupInvitation } from '../api/team-api';
import { type InvitationLookup } from '../api/schemas';
import { invitationStorage } from '../invitation-storage';

/** El token llega en el link (`#token=`) o quedó guardado del paso por el login. */
function initialToken(): string | null {
  const fromLink = takeHashToken();
  if (fromLink !== null) {
    invitationStorage.write(fromLink);
    return fromLink;
  }
  return invitationStorage.read();
}

/**
 * Lo que abre el link de una invitación. Funciona con o sin sesión: sin sesión ofrece entrar o
 * crear la cuenta (con el email ya puesto) y vuelve acá; con la sesión de otro email, lo dice.
 */
export default function InvitationRoute() {
  const [token] = useState(initialToken);

  const lookup = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => lookupInvitation(token ?? ''),
    enabled: token !== null,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (token === null) return <Message text={t.invitation.missing} />;
  if (lookup.isPending) return <Spinner label={t.common.loading} />;
  if (lookup.isError) {
    const notFound = isApiError(lookup.error) && lookup.error.errorCode === 'INVITATION_NOT_FOUND';
    return <Message text={notFound ? t.invitation.notFound : errorMessage(lookup.error)} />;
  }

  const invitation = lookup.data;
  if (invitation.status !== 'PENDING') {
    return (
      <Message
        text={
          invitation.status === 'EXPIRED'
            ? t.invitation.expired
            : invitation.status === 'REVOKED'
              ? t.invitation.revoked
              : t.invitation.accepted
        }
        home
      />
    );
  }

  return <PendingInvitation token={token} invitation={invitation} />;
}

function PendingInvitation({ token, invitation }: { token: string; invitation: InvitationLookup }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const business = invitation.businessName;
  const role = t.invitation.roles[invitation.role];

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: async (joined) => {
      invitationStorage.clear();
      // Que entre directo al negocio al que se sumó, no al que tenía elegido.
      writeSelectedBusiness(joined.urn);
      await queryClient.invalidateQueries({ queryKey: queryKeys.businesses() });
      toast.show({ message: t.invitation.joined.replace('{business}', business) });
      await navigate(paths.home, { replace: true, viewTransition: true });
    },
  });

  // Al volver del login, a esta misma pantalla, con el email ya puesto.
  const authState = { from: paths.invitation, email: invitation.email };

  const body =
    invitation.invitedByName === null
      ? t.invitation.bodyNoInviter.replace('{role}', role)
      : t.invitation.body.replace('{inviter}', invitation.invitedByName).replace('{role}', role);

  const signedInAs = state.status === 'authenticated' ? state.user.email.toLowerCase() : null;

  // Primer ingreso con la contraseña provisoria: el backend no deja aceptar hasta cambiarla.
  // El token queda guardado, así que después vuelve acá a terminar.
  if (state.status === 'authenticated' && state.user.mustChangePassword && signedInAs === invitation.email) {
    return <Navigate to={paths.changePassword} state={{ from: paths.invitation }} replace />;
  }

  return (
    <Card className="gap-5 py-6">
      <CardHeader className="px-6">
        <UsersIcon aria-hidden className="text-primary mb-1 size-8" />
        <CardTitle asChild>
          <h1 className="text-xl tracking-tight">{t.invitation.title.replace('{business}', business)}</h1>
        </CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 px-6">
        {accept.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(accept.error)}</AlertDescription>
          </Alert>
        )}

        {state.status === 'loading' ? (
          <Spinner label={t.auth.resuming} />
        ) : signedInAs === null ? (
          <>
            <p className="text-muted-foreground text-sm">
              {t.invitation.forEmail.replace('{email}', invitation.email)}
            </p>
            {/* No hay registro: sin cuenta, la crea un administrador y la invitación sigue sirviendo. */}
            {!invitation.accountExists && (
              <Alert variant="warning">
                <AlertDescription>{t.invitation.noAccount.replace('{email}', invitation.email)}</AlertDescription>
              </Alert>
            )}
            <Button asChild className="w-full">
              <Link viewTransition to={paths.login} state={authState}>
                {t.invitation.signIn.replace('{email}', invitation.email)}
              </Link>
            </Button>
          </>
        ) : signedInAs === invitation.email ? (
          <Button
            className="w-full"
            disabled={accept.isPending}
            onClick={() => {
              accept.mutate();
            }}
          >
            {accept.isPending ? t.invitation.accepting : t.invitation.accept.replace('{business}', business)}
          </Button>
        ) : (
          <>
            <Alert variant="warning">
              <AlertDescription>
                {t.invitation.otherAccount.replace('{current}', signedInAs).replace('{email}', invitation.email)}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                logout();
                void navigate(paths.login, {
                  state: authState,
                  viewTransition: true,
                });
              }}
            >
              {t.invitation.switchAccount.replace('{email}', invitation.email)}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Message({ text, home = false }: { text: string; home?: boolean }) {
  return (
    <Card className="gap-4 py-6">
      <CardContent className="grid gap-4 px-6">
        <p role="status" className="text-base">
          {text}
        </p>
        {home && (
          <Button asChild variant="outline" className="w-full">
            <Link viewTransition to={paths.home}>
              {t.invitation.goHome}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
