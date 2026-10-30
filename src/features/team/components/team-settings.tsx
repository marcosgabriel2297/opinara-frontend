import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CopyIcon, MessageCircleIcon, UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { type Business, type BusinessRole } from '@/features/businesses/api/schemas';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

import { INVITABLE_ROLES, type CreatedInvitation, type InvitableRole, type Member } from '../api/schemas';
import { useTeam, useTeamActions } from '../queries';

const inviteSchema = z.object({
  email: z.email(t.auth.validation.emailInvalid).trim().max(320, t.auth.validation.emailTooLong),
  role: z.enum(INVITABLE_ROLES),
});

type InviteValues = z.infer<typeof inviteSchema>;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase('es-AR') ?? '')
    .join('');

/** Mismas reglas que el backend: el OWNER saca a cualquiera menos a sí mismo; un ADMIN, solo a MEMBER. */
const canRemove = (viewer: BusinessRole, target: BusinessRole) =>
  target !== 'OWNER' && (viewer === 'OWNER' || (viewer === 'ADMIN' && target === 'MEMBER'));

/**
 * El equipo del negocio, en Configuración: quiénes entran, con qué rol, a quién se invitó y el
 * formulario para invitar. Sacar a alguien, irse o anular una invitación se deshace (el aviso queda
 * unos segundos) en vez de confirmarse.
 */
export function TeamSettings({ business }: { business: Business }) {
  const teamQuery = useTeam(business.urn);
  const actions = useTeamActions(business.urn);
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { state } = useAuth();
  const viewerUrn = state.status === 'authenticated' ? state.user.urn : null;

  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<unknown>(null);
  const hide = (urn: string, value: boolean) => {
    setHidden((current) => {
      const next = new Set(current);
      if (value) next.add(urn);
      else next.delete(urn);
      return next;
    });
  };

  const canInvite = business.role !== 'MEMBER';

  /** Sacar, irse y anular comparten la forma: se esconde ya y se ejecuta al cerrarse el aviso. */
  const undoable = (urn: string, message: string, run: () => Promise<unknown>, after?: () => void) => {
    setActionError(null);
    hide(urn, true);
    toast.undoable({
      message,
      run: () => {
        run()
          .then(after)
          .catch((error: unknown) => {
            hide(urn, false);
            setActionError(error);
          });
      },
      onUndo: () => {
        hide(urn, false);
      },
    });
  };

  const removeMember = (member: Member) => {
    const leaving = member.user.urn === viewerUrn;
    undoable(
      member.urn,
      leaving ? t.team.left.replace('{business}', business.name) : t.team.removed.replace('{name}', member.user.name),
      () => actions.remove.mutateAsync(member.urn),
      leaving
        ? () => {
            // Sin acceso a este negocio: la lista se recarga y se elige otro (o el alta, si no queda ninguno).
            void queryClient.invalidateQueries({ queryKey: queryKeys.businesses() });
            void navigate(paths.home, { replace: true, viewTransition: true });
          }
        : undefined,
    );
  };

  const changeRole = (member: Member, role: InvitableRole) => {
    setActionError(null);
    actions.changeRole.mutate(
      { memberUrn: member.urn, role },
      {
        onSuccess: () => {
          toast.show({
            message: t.team.roleChanged.replace('{name}', member.user.name).replace('{role}', t.invitation.roles[role]),
          });
        },
        onError: setActionError,
      },
    );
  };

  const members = teamQuery.data?.members.filter((member) => !hidden.has(member.urn)) ?? [];
  const invitations = teamQuery.data?.invitations.filter((invitation) => !hidden.has(invitation.urn)) ?? [];
  const self = members.find((member) => member.user.urn === viewerUrn);

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.team.title}</h2>
        </CardTitle>
        <CardDescription>{t.team.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {teamQuery.isError ? (
          <ErrorState error={teamQuery.error} onRetry={() => void teamQuery.refetch()} />
        ) : teamQuery.data === undefined ? (
          <div className="grid gap-3" aria-busy>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {members.map((member) => {
              const isSelf = member.user.urn === viewerUrn;
              const editable = business.role === 'OWNER' && member.role !== 'OWNER';
              return (
                <li key={member.urn} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="bg-brand-soft text-brand-strong flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  >
                    {initials(member.user.name)}
                  </span>
                  <span className="grid min-w-0 flex-1 basis-40">
                    <span className="flex items-center gap-2 truncate font-medium">
                      {member.user.name}
                      {isSelf && (
                        <Badge variant="outline" dot={false}>
                          {t.team.you}
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground truncate text-sm">{member.user.email}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {editable ? (
                      <NativeSelect
                        aria-label={t.team.roleLabel.replace('{name}', member.user.name)}
                        value={member.role}
                        disabled={actions.changeRole.isPending}
                        onChange={(event) => {
                          changeRole(member, event.target.value as InvitableRole);
                        }}
                        className="w-40"
                      >
                        {INVITABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {t.businesses.roles[role]}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Badge variant="outline" dot={false}>
                        {t.businesses.roles[member.role]}
                      </Badge>
                    )}
                    {!isSelf && canRemove(business.role, member.role) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t.team.removeLabel.replace('{name}', member.user.name)}
                        onClick={() => {
                          removeMember(member);
                        }}
                      >
                        {t.team.remove}
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {actionError !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(actionError)}</AlertDescription>
          </Alert>
        )}

        {invitations.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">{t.team.pendingTitle}</h3>
            <ul className="divide-y rounded-lg border border-dashed">
              {invitations.map((invitation) => (
                <li key={invitation.urn} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="grid min-w-0 flex-1 basis-40">
                    <span className="truncate font-medium">{invitation.email}</span>
                    <span className="text-muted-foreground text-sm">
                      {t.businesses.roles[invitation.role]} ·{' '}
                      {t.team.pendingExpires.replace('{date}', formatDate(invitation.expiresAt) ?? '')}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={t.team.revokeLabel.replace('{email}', invitation.email)}
                    onClick={() => {
                      undoable(invitation.urn, t.team.revoked.replace('{email}', invitation.email), () =>
                        actions.revoke.mutateAsync(invitation.urn),
                      );
                    }}
                  >
                    {t.team.revoke}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {canInvite && <InviteForm business={business} />}

        {self !== undefined && self.role !== 'OWNER' && (
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                removeMember(self);
              }}
            >
              {t.team.leave}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteForm({ business }: { business: Business }) {
  const { invite } = useTeamActions(business.urn);
  const toast = useToast();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  // Un ADMIN invita solo miembros (lo mismo valida el backend).
  const roles = business.role === 'OWNER' ? INVITABLE_ROLES : (['MEMBER'] as const);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setCreated(null);
    try {
      setCreated(await invite.mutateAsync(values));
      reset({ email: '', role: values.role });
    } catch (error) {
      setSubmitError(error);
    }
  });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: t.team.copied });
    } catch {
      // Sin permiso de portapapeles: el link igual está a la vista para copiarlo a mano.
    }
  };

  return (
    <section className="grid gap-3 border-t pt-5">
      <h3 className="text-sm font-semibold">{t.team.inviteTitle}</h3>

      {created !== null && (
        <Alert variant="success">
          <AlertTitle>{t.team.invitedTitle.replace('{email}', created.invitation.email)}</AlertTitle>
          <AlertDescription className="grid gap-3">
            <p>{t.team.invitedBody}</p>
            <p className="bg-card rounded-md border px-3 py-2 font-mono text-xs break-all">{created.inviteUrl}</p>
            <span className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void copy(created.inviteUrl)}>
                <CopyIcon aria-hidden />
                {t.team.copyLink}
              </Button>
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    t.team.whatsAppText.replace('{business}', business.name).replace('{url}', created.inviteUrl),
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircleIcon aria-hidden />
                  {t.team.shareWhatsApp}
                </a>
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {submitError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(submitError)}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start"
      >
        <Field id="invite-email" label={t.team.inviteEmail} error={errors.email?.message}>
          <Input
            id="invite-email"
            type="email"
            autoComplete="off"
            aria-invalid={errors.email !== undefined}
            aria-describedby={describedBy('invite-email', { error: errors.email?.message })}
            {...register('email')}
          />
        </Field>
        <Field id="invite-role" label={t.team.inviteRole} hint={t.team.rolesHelp[role]}>
          <NativeSelect
            id="invite-role"
            aria-describedby={describedBy('invite-role', { hint: true })}
            className="w-full"
            {...register('role')}
          >
            {roles.map((option) => (
              <option key={option} value={option}>
                {t.businesses.roles[option]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button type="submit" disabled={isSubmitting} className="sm:mt-6">
          <UserPlusIcon aria-hidden />
          {isSubmitting ? t.team.inviting : t.team.invite}
        </Button>
      </form>
      {business.role === 'ADMIN' && <p className="text-muted-foreground text-xs">{t.team.adminInvitesMembers}</p>}
    </section>
  );
}
