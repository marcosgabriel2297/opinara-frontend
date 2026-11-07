import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { Field } from '@/components/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { type Location } from '@/features/locations/api/schemas';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { createProgramSchema, type CreateProgramValues } from '../api/validation';
import { useCreateProgram } from '../queries';

interface CreateProgramFormProps {
  businessUrn: string;
  /** Las sucursales activas que todavía no tienen tarjeta. */
  locations: Location[];
  onCancel: () => void;
}

const DEFAULT_STAMPS = 5;

export function CreateProgramForm({ businessUrn, locations, onCancel }: CreateProgramFormProps) {
  const createMutation = useCreateProgram(businessUrn);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProgramValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      locationUrn: locations[0]?.urn ?? '',
      rewardDescription: '',
      stampsRequired: DEFAULT_STAMPS,
      terms: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const program = await createMutation.mutateAsync({
        locationUrn: values.locationUrn,
        rewardDescription: values.rewardDescription,
        stampsRequired: values.stampsRequired,
        ...(values.terms === '' ? {} : { terms: values.terms }),
      });
      // Derecho al QR para imprimir: es lo próximo que hay que hacer.
      await navigate(paths.loyaltyProgram(program.urn), { viewTransition: true });
    } catch (error) {
      setSubmitError(error);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.loyalty.newTitle}</h2>
        </CardTitle>
        <CardDescription>{t.loyalty.newSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <Field id="program-location" label={t.loyalty.fields.location} error={errors.locationUrn?.message}>
            <NativeSelect
              id="program-location"
              className="w-full"
              aria-invalid={errors.locationUrn !== undefined}
              {...register('locationUrn')}
            >
              {locations.map((location) => (
                <option key={location.urn} value={location.urn}>
                  {location.title}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <RewardFields register={register} errors={errors} idPrefix="program" autoFocus />

          <div className="mt-2 flex items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.loyalty.creating : t.loyalty.create}
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

type RewardValues = Pick<CreateProgramValues, 'rewardDescription' | 'stampsRequired' | 'terms'>;

/**
 * Premio, sellos y condiciones: los mismos campos al crear y al editar. Recibe el `register` de un
 * formulario que tenga al menos estos tres campos.
 */
export function RewardFields({
  register: reg,
  errors: err,
  idPrefix,
  autoFocus = false,
}: {
  register: UseFormRegister<RewardValues>;
  errors: FieldErrors<RewardValues>;
  idPrefix: string;
  autoFocus?: boolean;
}) {
  return (
    <>
      <Field
        id={`${idPrefix}-reward`}
        label={t.loyalty.fields.reward}
        hint={t.loyalty.fields.rewardHint}
        error={err.rewardDescription?.message}
      >
        <Input
          id={`${idPrefix}-reward`}
          autoFocus={autoFocus}
          aria-invalid={err.rewardDescription !== undefined}
          aria-describedby={describedBy(`${idPrefix}-reward`, { error: err.rewardDescription?.message, hint: true })}
          {...reg('rewardDescription')}
        />
      </Field>

      <Field
        id={`${idPrefix}-stamps`}
        label={t.loyalty.fields.stamps}
        hint={t.loyalty.fields.stampsHint}
        error={err.stampsRequired?.message}
      >
        <Input
          id={`${idPrefix}-stamps`}
          type="number"
          inputMode="numeric"
          min={2}
          max={20}
          className="w-28"
          aria-invalid={err.stampsRequired !== undefined}
          aria-describedby={describedBy(`${idPrefix}-stamps`, { error: err.stampsRequired?.message, hint: true })}
          {...reg('stampsRequired', { valueAsNumber: true })}
        />
      </Field>

      <Field
        id={`${idPrefix}-terms`}
        label={t.loyalty.fields.terms}
        hint={t.loyalty.fields.termsHint}
        error={err.terms?.message}
      >
        <Textarea
          id={`${idPrefix}-terms`}
          rows={2}
          aria-invalid={err.terms !== undefined}
          aria-describedby={describedBy(`${idPrefix}-terms`, { error: err.terms?.message, hint: true })}
          {...reg('terms')}
        />
      </Field>
    </>
  );
}
