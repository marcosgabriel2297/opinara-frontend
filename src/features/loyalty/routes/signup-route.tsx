import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { signupSchema, type SignupValues } from '../api/validation';
import { rememberCardToken } from '../card-storage';
import { PublicShell } from '../components/public-shell';
import { StampDots } from '../components/stamp-dots';
import { useRegister, useSignup } from '../queries';

/**
 * Lo que abre el QR de alta de una sucursal: un formulario corto y, al enviarlo, la tarjeta.
 *
 * Solo pide lo necesario (nombre y celular; el email es opcional) y separa la aceptación de las
 * condiciones (obligatoria) de las promociones (opcional). No dice nada de reseñas.
 */
export default function SignupRoute() {
  const { businessSlug = '', programSlug = '' } = useParams();
  const signupQuery = useSignup(businessSlug, programSlug);

  if (signupQuery.isPending) {
    return (
      <PublicShell>
        <Spinner label={t.common.loading} />
      </PublicShell>
    );
  }

  if (signupQuery.isError) {
    return (
      <PublicShell>
        <div className="grid gap-2 pt-16 text-center">
          <h1 className="text-xl font-semibold">{t.loyalty.signup.unavailableTitle}</h1>
          <p className="text-muted-foreground">{t.loyalty.signup.unavailableBody}</p>
        </div>
      </PublicShell>
    );
  }

  const { business, location, program } = signupQuery.data;

  return (
    <PublicShell business={business} subtitle={location.title}>
      <section className="bg-card grid justify-items-center gap-3 rounded-xl border p-5 text-center">
        <h1 className="text-lg font-semibold text-balance">
          {t.loyalty.signup.reward
            .replace('{count}', String(program.stampsRequired))
            .replace('{reward}', program.rewardDescription)}
        </h1>
        <StampDots stamps={0} total={program.stampsRequired} />
        <p className="text-muted-foreground text-sm">{t.loyalty.signup.intro}</p>
      </section>

      <SignupForm businessSlug={businessSlug} programSlug={programSlug} businessName={business.name} />

      {program.terms !== null && (
        <section className="grid gap-1 text-sm">
          <h2 className="font-medium">{t.loyalty.signup.terms}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{program.terms}</p>
        </section>
      )}
    </PublicShell>
  );
}

function SignupForm({
  businessSlug,
  programSlug,
  businessName,
}: {
  businessSlug: string;
  programSlug: string;
  businessName: string;
}) {
  const registerMutation = useRegister(businessSlug, programSlug);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', phone: '', email: '', acceptTerms: false, marketing: false, trap: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const token = await registerMutation.mutateAsync({
        name: values.name,
        phone: values.phone,
        ...(values.email === '' ? {} : { email: values.email }),
        acceptTerms: values.acceptTerms,
        marketing: values.marketing,
        ...(values.trap === '' ? {} : { website: values.trap }),
      });
      rememberCardToken(token);
      // Con el token en la URL: es lo que se guarda si agrega la tarjeta a la pantalla de inicio.
      await navigate(`${paths.loyaltyCard}#token=${token}`, { replace: true, state: { registered: true } });
    } catch (error) {
      setSubmitError(error);
    }
  });

  const s = t.loyalty.signup;

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
      {submitError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(submitError)}</AlertDescription>
        </Alert>
      )}

      <Field id="signup-name" label={s.name} error={errors.name?.message}>
        <Input
          id="signup-name"
          autoComplete="given-name"
          aria-invalid={errors.name !== undefined}
          aria-describedby={describedBy('signup-name', { error: errors.name?.message })}
          {...register('name')}
        />
      </Field>

      <Field id="signup-phone" label={s.phone} hint={s.phoneHint} error={errors.phone?.message}>
        <Input
          id="signup-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={errors.phone !== undefined}
          aria-describedby={describedBy('signup-phone', { error: errors.phone?.message, hint: true })}
          {...register('phone')}
        />
      </Field>

      <Field id="signup-email" label={s.email} hint={s.emailHint} error={errors.email?.message}>
        <Input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={errors.email !== undefined}
          aria-describedby={describedBy('signup-email', { error: errors.email?.message, hint: true })}
          {...register('email')}
        />
      </Field>

      {/* El campo trampa: fuera de la vista y del orden de tabulación. Solo lo completa un bot.
          Sin "website", "url" ni nada parecido en el id, el nombre o la etiqueta: con eso el
          autocompletado del navegador (o un gestor de contraseñas) lo llenaba solo y el alta se
          descartaba como si fuera de un bot. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="signup-hp">{s.trap}</label>
        <input
          id="signup-hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          {...register('trap')}
        />
      </div>

      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            className="mt-0.5 size-5"
            aria-invalid={errors.acceptTerms !== undefined}
            aria-describedby={
              errors.acceptTerms === undefined ? 'signup-whatsapp-notice' : 'signup-whatsapp-notice signup-accept-error'
            }
            {...register('acceptTerms')}
          />
          <span>
            {s.acceptBefore}
            <Link to={paths.privacy} target="_blank" className="text-primary underline underline-offset-4">
              {s.privacyLink}
            </Link>
            {s.acceptAfter}
          </span>
        </label>
        {/* Parte de las condiciones que se aceptan: los recordatorios por WhatsApp (ver `TermsVersion`). */}
        <p id="signup-whatsapp-notice" className="text-muted-foreground pl-8 text-xs">
          {s.whatsAppNotice.replace('{business}', businessName)}
        </p>
        {errors.acceptTerms?.message !== undefined && (
          <p id="signup-accept-error" role="alert" className="text-destructive text-sm">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <Checkbox className="mt-0.5 size-5" {...register('marketing')} />
        <span>{s.marketing.replace('{business}', businessName)}</span>
      </label>

      <Button type="submit" size="touch" disabled={isSubmitting}>
        {isSubmitting ? s.submitting : s.submit}
      </Button>
    </form>
  );
}
