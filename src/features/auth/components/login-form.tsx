import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { describedBy } from '@/lib/described-by';
import { PasswordInput } from '@/components/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage, t } from '@/i18n';
import { startDemo } from '@/lib/demo';

import { loginSchema, type LoginValues } from '../api/validation';
import { emailFrom, redirectTargetFrom } from '../redirect-target';
import { useAuth } from '../use-auth';

export function LoginForm() {
  const { login, state } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailFrom(location.state), password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      await navigate(redirectTargetFrom(location.state), { replace: true, viewTransition: true });
    } catch (error) {
      setSubmitError(error);
    }
  });

  // Si llegó acá por una sesión vencida o una cuenta desactivada, se lo decimos antes de que
  // vuelva a escribir la contraseña sin saber qué pasó.
  const reason = state.status === 'anonymous' ? state.reason : undefined;

  return (
    <Card className="gap-6 py-6">
      <CardHeader className="px-6">
        <CardTitle asChild>
          <h1 className="text-xl tracking-tight">{t.auth.login.title}</h1>
        </CardTitle>
        <CardDescription>{t.auth.login.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="px-6">
        {reason !== undefined && submitError === null && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              {reason === 'inactive' ? t.errors.accountInactive : t.auth.sessionExpired}
            </AlertDescription>
          </Alert>
        )}

        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field id="email" label={t.auth.fields.email} error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              aria-invalid={errors.email !== undefined}
              aria-describedby={describedBy('email', { error: errors.email?.message })}
              {...register('email')}
            />
          </Field>

          <Field id="password" label={t.auth.fields.password} error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={errors.password !== undefined}
              aria-describedby={describedBy('password', { error: errors.password?.message })}
              {...register('password')}
            />
          </Field>

          <Link
            viewTransition
            to={paths.forgotPassword}
            className="text-muted-foreground hover:text-foreground -mt-2 w-fit text-sm underline underline-offset-4"
          >
            {t.auth.forgot.link}
          </Link>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 border-t pt-5 text-center text-sm">{t.auth.login.noAccount}</p>
        <div className="mt-3 grid justify-items-center gap-0.5 text-center">
          <Button type="button" variant="link" onClick={startDemo} className="h-auto min-h-11 text-sm md:min-h-0">
            {t.auth.login.demo}
          </Button>
          <span className="text-muted-foreground text-xs">{t.auth.login.demoHint}</span>
        </div>
      </CardContent>
    </Card>
  );
}
