import { zodResolver } from '@hookform/resolvers/zod';
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
import { type Location } from '@/features/locations/api/schemas';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';
import { isApiError } from '@/lib/http';
import { slugPreview } from '@/lib/slug';

import { createCampaignSchema, type CreateCampaignValues } from '../api/validation';
import { useCreateCampaign } from '../queries';

interface CreateCampaignFormProps {
  businessUrn: string;
  businessName: string;
  businessSlug: string;
  locations: Location[];
  onCancel: () => void;
}

/** Una sucursal sin `googleReviewUrl` no puede usarse: el backend responde `LOCATION_NOT_REVIEWABLE`. */
const isReviewable = (location: Location) => location.googleReviewUrl !== undefined;

export function CreateCampaignForm({
  businessUrn,
  businessName,
  businessSlug,
  locations,
  onCancel,
}: CreateCampaignFormProps) {
  const createMutation = useCreateCampaign(businessUrn);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const reviewable = locations.filter(isReviewable);
  const firstReviewable = reviewable[0]?.urn ?? '';

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { name: '', locationUrn: firstReviewable, slug: '' },
  });

  const name = useWatch({ control, name: 'name' });
  const slug = useWatch({ control, name: 'slug' });
  const preview = slug !== '' ? slug : slugPreview(name);

  if (reviewable.length === 0) {
    return (
      <Alert variant="warning">
        <AlertDescription className="grid gap-2">
          <p className="font-medium">{t.campaigns.noReviewableLocations}</p>
          <p>{t.campaigns.noReviewableLocationsBody}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const campaign = await createMutation.mutateAsync({
        name: values.name,
        locationUrn: values.locationUrn,
        ...(values.slug === '' ? {} : { slug: values.slug }),
      });

      // Derecho al QR: es lo que la persona vino a buscar.
      await navigate(paths.campaign(campaign.urn), { viewTransition: true });
    } catch (error) {
      // Los problemas del identificador van en su campo, con el foco ahí: un cartel arriba que dice
      // "ya existe" sin señalar qué cambiar deja a la persona adivinando.
      if (isApiError(error) && error.is('CAMPAIGN_SLUG_ALREADY_EXISTS')) {
        const taken = values.slug === '' ? slugPreview(values.name) : values.slug;
        setError('slug', { type: 'server', message: t.campaigns.validation.slugTaken.replaceAll('{slug}', taken) });
        setFocus('slug');
        return;
      }
      if (isApiError(error) && error.is('SLUG_NOT_DERIVABLE')) {
        setError('slug', { type: 'server', message: errorMessage(error) });
        setFocus('slug');
        return;
      }
      setSubmitError(error);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.campaigns.newTitle}</h2>
        </CardTitle>
        <CardDescription className="grid gap-1">
          <p>{t.campaigns.newSubtitle}</p>
          {/* Con varios negocios, que no quede duda de dónde se crea (y qué negocio va en el QR). */}
          <p>
            {t.campaigns.createdIn.split('{business}')[0]}
            <span className="text-foreground font-medium">{businessName}</span>
            {t.campaigns.createdIn.split('{business}')[1]}
          </p>
        </CardDescription>
      </CardHeader>

      <CardContent>
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field
            id="campaign-name"
            label={t.campaigns.fields.name}
            hint={t.campaigns.fields.nameHint}
            error={errors.name?.message}
          >
            <Input
              id="campaign-name"
              autoFocus
              aria-invalid={errors.name !== undefined}
              aria-describedby={describedBy('campaign-name', { error: errors.name?.message, hint: true })}
              {...register('name')}
            />
          </Field>

          <Field id="campaign-location" label={t.campaigns.fields.location} error={errors.locationUrn?.message}>
            <NativeSelect
              id="campaign-location"
              className="w-full"
              aria-invalid={errors.locationUrn !== undefined}
              {...register('locationUrn')}
            >
              {locations.map((location) => (
                <option
                  key={location.urn}
                  value={location.urn}
                  // Deshabilitada y con el motivo a la vista: enterarse al enviar sería peor.
                  disabled={!isReviewable(location)}
                  title={isReviewable(location) ? undefined : t.campaigns.notReviewableHint}
                >
                  {location.title}
                  {isReviewable(location) ? '' : ` — ${t.campaigns.notReviewable}`}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {locations.length > reviewable.length && (
            <p className="text-muted-foreground text-xs">{t.campaigns.notReviewableHint}</p>
          )}

          <Field
            id="campaign-slug"
            label={t.campaigns.fields.slug}
            hint={t.campaigns.fields.slugHint}
            error={errors.slug?.message}
          >
            <Input
              id="campaign-slug"
              aria-invalid={errors.slug !== undefined}
              aria-describedby={describedBy('campaign-slug', { error: errors.slug?.message, hint: true })}
              {...register('slug')}
            />
          </Field>

          {preview !== '' && (
            <p className="text-muted-foreground text-xs">
              {t.businesses.urlPreview}{' '}
              <code className="text-foreground font-mono">{paths.publicCampaign(businessSlug, preview)}</code>
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.campaigns.creating : t.campaigns.create}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
