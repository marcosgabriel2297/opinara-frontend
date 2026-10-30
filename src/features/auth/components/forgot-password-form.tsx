import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { forgotPassword } from '../api/auth-api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../api/validation';

/**
 * Pide el link para elegir una contraseña nueva. La respuesta es la misma exista o no la cuenta:
 * la pantalla no confirma qué emails están registrados.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await forgotPassword(values.email);
      setSentTo(values.email);
    } catch (error) {
      setSubmitError(error);
    }
  });

  if (sentTo !== null) {
    return (
      <Card className="gap-4 py-6">
        <CardHeader className="px-6">
          <MailCheckIcon aria-hidden className="text-primary mb-1 size-8" />
          <CardTitle asChild>
            <h1 className="text-xl tracking-tight">{t.auth.forgot.sentTitle}</h1>
          </CardTitle>
          <CardDescription>{t.auth.forgot.sent.replace('{email}', sentTo)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-6">
          <p className="text-muted-foreground text-sm">{t.auth.forgot.spamHint}</p>
          <Button asChild variant="outline" className="w-full">
            <Link viewTransition to={paths.login}>
              {t.auth.forgot.backToLogin}
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
          <h1 className="text-xl tracking-tight">{t.auth.forgot.title}</h1>
        </CardTitle>
        <CardDescription>{t.auth.forgot.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="px-6">
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

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t.auth.forgot.submitting : t.auth.forgot.submit}
          </Button>
        </form>

        <p className="mt-6 border-t pt-5 text-center text-sm">
          <Link viewTransition to={paths.login} className="text-foreground font-medium underline underline-offset-4">
            {t.auth.forgot.backToLogin}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
