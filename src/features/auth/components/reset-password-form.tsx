import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { PasswordInput } from '@/components/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';
import { isApiError } from '@/lib/http';

import { resetPassword } from '../api/auth-api';
import { resetPasswordSchema, type ResetPasswordValues } from '../api/validation';
import { takeHashToken } from '../hash-token';

/** La contraseña nueva, con el token del link del mail. */
export function ResetPasswordForm() {
  // Se lee una vez al montar: después se borra de la barra de direcciones.
  const [token] = useState(takeHashToken);
  const [state, setState] = useState<'form' | 'done' | 'invalid'>(token === null ? 'invalid' : 'form');
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (token === null) return;
    setSubmitError(null);
    try {
      await resetPassword(token, values.password);
      setState('done');
    } catch (error) {
      if (isApiError(error) && error.errorCode === 'INVALID_RESET_TOKEN') setState('invalid');
      else setSubmitError(error);
    }
  });

  if (state === 'invalid') {
    return (
      <Card className="gap-4 py-6">
        <CardHeader className="px-6">
          <CardTitle asChild>
            <h1 className="text-xl tracking-tight">{t.auth.reset.invalidTitle}</h1>
          </CardTitle>
          <CardDescription>{t.auth.reset.invalid}</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Button asChild className="w-full">
            <Link viewTransition to={paths.forgotPassword}>
              {t.auth.reset.requestNew}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'done') {
    return (
      <Card className="gap-4 py-6">
        <CardHeader className="px-6">
          <CircleCheckIcon aria-hidden className="text-primary mb-1 size-8" />
          <CardTitle asChild>
            <h1 className="text-xl tracking-tight">{t.auth.reset.doneTitle}</h1>
          </CardTitle>
          <CardDescription>{t.auth.reset.done}</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Button asChild className="w-full">
            <Link viewTransition to={paths.login}>
              {t.auth.reset.goToLogin}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-6 py-6">
      <CardHeader className="px-6">
        <CardTitle asChild>
          <h1 className="text-xl tracking-tight">{t.auth.reset.title}</h1>
        </CardTitle>
        <CardDescription>{t.auth.reset.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="px-6">
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field
            id="password"
            label={t.auth.reset.field}
            hint={t.auth.fields.passwordHint}
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              autoFocus
              aria-invalid={errors.password !== undefined}
              aria-describedby={describedBy('password', { error: errors.password?.message, hint: true })}
              {...register('password')}
            />
          </Field>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t.auth.reset.submitting : t.auth.reset.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
