import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';
import { isApiError } from '@/lib/http';
import { queryKeys } from '@/lib/query-keys';
import { slugPreview } from '@/lib/slug';

import { createBusiness } from '../api/businesses-api';
import { createBusinessSchema, type CreateBusinessValues } from '../api/validation';
import { useBusinesses } from '../use-business';

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Zonas horarias habituales; la del navegador se agrega sola si no está en la lista. */
const TIMEZONES = [
  DEFAULT_TIMEZONE,
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Montevideo',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Mexico_City',
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function CreateBusinessForm() {
  const { select } = useBusinesses();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const detected = detectTimezone();
  const options = TIMEZONES.includes(detected) ? TIMEZONES : [detected, ...TIMEZONES];

  const {
    register,
    handleSubmit,
    control,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessValues>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: { name: '', slug: '', timezone: detected },
  });

  // `useWatch` en vez de `watch()`: devuelve un valor, no una función nueva en cada render.
  const name = useWatch({ control, name: 'name' });
  const slug = useWatch({ control, name: 'slug' });
  const preview = slug !== '' ? slug : slugPreview(name);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const business = await createBusiness({
        name: values.name,
        // El slug se manda solo si el usuario escribió uno: si no, lo deriva el backend.
        ...(values.slug === '' ? {} : { slug: values.slug }),
        timezone: values.timezone,
      });

      select(business.urn);
      await queryClient.invalidateQueries({ queryKey: queryKeys.businesses() });
      // El paso siguiente del onboarding es conectar Google.
      await navigate(paths.google, { replace: true, viewTransition: true });
    } catch (error) {
      setSubmitError(error);
      // Un nombre de solo emojis no da slug: hay que pedirlo a mano, y conviene llevarlo al campo.
      if (isApiError(error) && error.is('SLUG_NOT_DERIVABLE')) setFocus('slug');
    }
  });

  return (
    <Card className="gap-6 py-6">
      <CardHeader className="px-6">
        <CardTitle asChild>
          <h1 className="text-xl tracking-tight">{t.businesses.onboarding.title}</h1>
        </CardTitle>
        <CardDescription>{t.businesses.onboarding.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="px-6">
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field
            id="name"
            label={t.businesses.fields.name}
            hint={t.businesses.fields.nameHint}
            error={errors.name?.message}
          >
            <Input
              id="name"
              autoFocus
              autoComplete="organization"
              aria-invalid={errors.name !== undefined}
              aria-describedby={describedBy('name', { error: errors.name?.message, hint: true })}
              {...register('name')}
            />
          </Field>

          <Field
            id="slug"
            label={t.businesses.fields.slug}
            hint={t.businesses.fields.slugHint}
            error={errors.slug?.message}
          >
            <Input
              id="slug"
              placeholder={slugPreview(name)}
              aria-invalid={errors.slug !== undefined}
              aria-describedby={describedBy('slug', { error: errors.slug?.message, hint: true })}
              {...register('slug')}
            />
          </Field>

          {preview !== '' && (
            <p className="text-muted-foreground text-xs">
              {t.businesses.urlPreview}{' '}
              <code className="text-foreground font-mono">
                {paths.publicBusiness(preview)}/<span className="opacity-60">campaña</span>
              </code>
            </p>
          )}

          <Field id="timezone" label={t.businesses.fields.timezone} error={errors.timezone?.message}>
            <NativeSelect id="timezone" className="w-full" {...register('timezone')}>
              {options.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, ' ')}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t.businesses.onboarding.submitting : t.businesses.onboarding.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
