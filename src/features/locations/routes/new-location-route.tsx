import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2Icon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { type Location } from '../api/schemas';
import { createLocationSchema, type CreateLocationFormValues, type CreateLocationValues } from '../api/validation';
import { canManageLocations } from '../permissions';
import { useCreateLocation } from '../queries';

/** La herramienta de Google para encontrar el Place ID de un local en el mapa. */
const PLACE_ID_FINDER = 'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder';

/**
 * Alta manual de una sucursal: con el Place ID alcanza para el circuito del QR, que solo necesita
 * el link de reseña. Es lo que permite usar Opinara antes de que Google habilite su API.
 */
export default function NewLocationRoute() {
  const business = useCurrentBusiness();
  const [created, setCreated] = useState<Location | null>(null);

  return (
    <>
      <PageHeader
        title={t.locations.new.title}
        description={t.locations.new.description}
        back={{ to: paths.settings, label: t.locations.new.back }}
      />

      <div className="grid max-w-2xl gap-6">
        {!canManageLocations(business.role) ? (
          <Alert>
            <AlertDescription>{t.locations.new.readOnly}</AlertDescription>
          </Alert>
        ) : created === null ? (
          <NewLocationForm businessUrn={business.urn} onCreated={setCreated} />
        ) : (
          <Created
            location={created}
            onAddAnother={() => {
              setCreated(null);
            }}
          />
        )}
      </div>
    </>
  );
}

function NewLocationForm({ businessUrn, onCreated }: { businessUrn: string; onCreated: (location: Location) => void }) {
  const createMutation = useCreateLocation(businessUrn);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLocationFormValues, unknown, CreateLocationValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: { title: '', placeId: '', address: '' },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        title: values.title,
        placeId: values.placeId,
        // La dirección es opcional: vacía no se manda.
        ...(values.address === '' ? {} : { address: values.address }),
      },
      { onSuccess: onCreated },
    );
  });

  return (
    <Card>
      <CardContent>
        {createMutation.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(createMutation.error)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-5">
          <Field
            id="location-title"
            label={t.locations.fields.title}
            hint={t.locations.fields.titleHint}
            error={errors.title?.message}
          >
            <Input
              id="location-title"
              autoFocus
              aria-invalid={errors.title !== undefined}
              aria-describedby={describedBy('location-title', { error: errors.title?.message, hint: true })}
              {...register('title')}
            />
          </Field>

          <div className="grid gap-2">
            <Field
              id="location-place-id"
              label={t.locations.fields.placeId}
              hint={t.locations.fields.placeIdHint}
              error={errors.placeId?.message}
            >
              <Input
                id="location-place-id"
                placeholder="ChIJ…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                aria-invalid={errors.placeId !== undefined}
                aria-describedby={describedBy('location-place-id', { error: errors.placeId?.message, hint: true })}
                {...register('placeId')}
              />
            </Field>
            <a
              href={PLACE_ID_FINDER}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-strong inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              {t.locations.fields.placeIdFinder}{' '}
              <span className="sr-only">{t.locations.fields.placeIdFinderContext}</span>
              <ExternalLinkIcon aria-hidden className="size-3.5" />
            </a>
          </div>

          <Field id="location-address" label={t.locations.fields.address} error={errors.address?.message}>
            <Input
              id="location-address"
              autoComplete="street-address"
              aria-invalid={errors.address !== undefined}
              aria-describedby={describedBy('location-address', { error: errors.address?.message })}
              {...register('address')}
            />
          </Field>

          <Button type="submit" disabled={createMutation.isPending} className="w-fit max-sm:w-full">
            {createMutation.isPending ? t.locations.new.submitting : t.locations.new.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Lo creado y el control que importa antes de imprimir: que el link de reseña abra el local
 * correcto. Si el Place ID está mal, todos los QR de esa sucursal heredan el error.
 */
function Created({ location, onAddAnother }: { location: Location; onAddAnother: () => void }) {
  // El formulario desaparece: el foco va al resultado para no perderse en `body`.
  const titleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <div ref={titleRef} tabIndex={-1} role="status" className="flex items-center gap-2 outline-none">
            <CheckCircle2Icon aria-hidden className="text-brand-strong size-5" />
            <h2>{t.locations.created.title.replace('{title}', location.title)}</h2>
          </div>
        </CardTitle>
        {location.address !== undefined && <CardDescription>{location.address}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-5">
        {location.googleReviewUrl !== undefined && (
          <Alert variant="warning">
            <AlertTitle>{t.locations.created.checkTitle}</AlertTitle>
            <AlertDescription className="grid gap-3">
              <p>{t.locations.created.body}</p>
              <a
                href={location.googleReviewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}
              >
                {t.locations.created.checkLink} <span className="sr-only">{t.locations.created.checkLinkContext}</span>
                <ExternalLinkIcon aria-hidden className="size-3.5" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link viewTransition to={paths.campaigns}>
              {t.locations.created.createCampaign}
            </Link>
          </Button>
          <Button variant="outline" onClick={onAddAnother}>
            {t.locations.created.addAnother}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
