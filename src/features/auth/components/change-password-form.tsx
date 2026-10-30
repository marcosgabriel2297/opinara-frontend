import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { PasswordInput } from '@/components/password-input';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { changePasswordSchema, type ChangePasswordValues } from '../api/validation';
import { redirectTargetFrom } from '../redirect-target';
import { useAuth } from '../use-auth';

/**
 * El primer ingreso: la cuenta la creó un administrador con una contraseña provisoria, y hasta
 * cambiarla el backend no deja hacer nada más. Al guardarla, el guard deja pasar y esta pantalla
 * manda a donde quería ir.
 */
export function ChangePasswordForm() {
  const { state, changePassword, logout } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.show({ message: t.auth.change.done });
    } catch (error) {
      setSubmitError(error);
    }
  });

  // Solo tiene sentido con la contraseña provisoria; también es lo que saca de acá al guardarla.
  if (state.status !== 'authenticated' || !state.user.mustChangePassword) {
    return <Navigate to={redirectTargetFrom(location.state)} replace />;
  }

  return (
    <Card className="gap-6 py-6">
      <CardHeader className="px-6">
        <CardTitle asChild>
          <h1 className="text-xl tracking-tight">{t.auth.change.title}</h1>
        </CardTitle>
        <CardDescription>{t.auth.change.subtitle.replace('{email}', state.user.email)}</CardDescription>
      </CardHeader>

      <CardContent className="px-6">
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field id="currentPassword" label={t.auth.change.current} error={errors.currentPassword?.message}>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              autoFocus
              aria-invalid={errors.currentPassword !== undefined}
              aria-describedby={describedBy('currentPassword', { error: errors.currentPassword?.message })}
              {...register('currentPassword')}
            />
          </Field>

          <Field
            id="newPassword"
            label={t.auth.change.new}
            hint={t.auth.fields.passwordHint}
            error={errors.newPassword?.message}
          >
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              aria-invalid={errors.newPassword !== undefined}
              aria-describedby={describedBy('newPassword', { error: errors.newPassword?.message, hint: true })}
              {...register('newPassword')}
            />
          </Field>

          <Field id="confirmPassword" label={t.auth.change.confirm} error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              aria-invalid={errors.confirmPassword !== undefined}
              aria-describedby={describedBy('confirmPassword', { error: errors.confirmPassword?.message })}
              {...register('confirmPassword')}
            />
          </Field>

          {/* Es el primer ingreso: el momento en que acepta las condiciones. Abren aparte para no perder el formulario. */}
          <p className="text-muted-foreground text-xs">
            {t.auth.change.acceptance.before}{' '}
            <Link to={paths.terms} target="_blank" rel="noopener" className="underline underline-offset-4">
              {t.auth.change.acceptance.terms}
            </Link>{' '}
            {t.auth.change.acceptance.middle}{' '}
            <Link to={paths.privacy} target="_blank" rel="noopener" className="underline underline-offset-4">
              {t.auth.change.acceptance.privacy}
            </Link>
            .
          </p>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t.auth.change.submitting : t.auth.change.submit}
          </Button>
        </form>

        <div className="mt-6 grid justify-items-center border-t pt-5">
          <Button type="button" variant="link" onClick={logout} className="h-auto min-h-11 text-sm md:min-h-0">
            {t.auth.change.logout}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
