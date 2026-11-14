import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Field } from '@/components/field';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { type UpdateProgramInput } from '../api/loyalty-api';
import { type LoyaltyProgram } from '../api/schemas';
import { INACTIVE_DAYS, reminderMessageSchema, type ReminderMessageValues } from '../api/validation';
import { useUpdateProgram } from '../queries';
import { renderReminder } from '../reminder-message';

/** Los dos recordatorios: "te falta poco" y "hace un tiempo que no venís". */
export type ReminderKind = 'nearReward' | 'inactive';

const FIELDS = {
  nearReward: { message: 'reminderMessage', isDefault: 'reminderMessageIsDefault' },
  inactive: { message: 'inactiveReminderMessage', isDefault: 'inactiveReminderMessageIsDefault' },
} as const;

/** Un cliente de ejemplo para la vista previa: cerca del premio, o con un sello y hace rato. */
const SAMPLE_STAMPS: Record<ReminderKind, (required: number) => number> = {
  nearReward: (required) => Math.max(1, required - 2),
  inactive: () => 1,
};

/**
 * La plantilla de un recordatorio por WhatsApp de la sucursal, con su vista previa. Arranca con el
 * texto recomendado; "Usar el recomendado" vuelve a él. El de "no viene" elige además a los cuántos
 * días sin venir se recomienda. Solo OWNER y ADMIN.
 */
export function ReminderSettings({
  businessUrn,
  program,
  kind,
}: {
  businessUrn: string;
  program: LoyaltyProgram;
  kind: ReminderKind;
}) {
  const business = useCurrentBusiness();
  const updateMutation = useUpdateProgram(businessUrn, program.urn);
  const toast = useToast();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const r = t.loyalty.reminderSettings;
  const k = r[kind];
  const id = `reminder-${kind}`;
  const fields = FIELDS[kind];
  const isDefault = program[fields.isDefault];
  const current = (updated: LoyaltyProgram): ReminderMessageValues => ({
    message: updated[fields.message],
    inactiveDays: updated.inactiveDays,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ReminderMessageValues>({
    resolver: zodResolver(reminderMessageSchema),
    defaultValues: current(program),
  });
  const message = useWatch({ control, name: 'message' });

  const save = async (input: UpdateProgramInput, notice: string) => {
    setSubmitError(null);
    try {
      const updated = await updateMutation.mutateAsync(input);
      reset(current(updated));
      toast.show({ message: notice });
    } catch (error) {
      setSubmitError(error);
    }
  };

  const onSubmit = handleSubmit((values) =>
    save(
      kind === 'inactive'
        ? { inactiveReminderMessage: values.message, inactiveDays: values.inactiveDays }
        : { reminderMessage: values.message },
      r.saved,
    ),
  );

  const stamps = SAMPLE_STAMPS[kind](program.stampsRequired);
  const preview = renderReminder(message, {
    name: r.previewName,
    stamps,
    stampsRequired: program.stampsRequired,
    missingStamps: program.stampsRequired - stamps,
    rewardDescription: program.rewardDescription,
    businessName: business.name,
    locationTitle: program.location.title,
    cardUrl: r.previewLink,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{k.title}</h2>
        </CardTitle>
        <CardDescription>{k.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          {kind === 'inactive' && (
            <Field
              id={`${id}-days`}
              label={r.inactiveDays}
              hint={r.inactiveDaysHint}
              error={errors.inactiveDays?.message}
            >
              <Input
                id={`${id}-days`}
                type="number"
                inputMode="numeric"
                min={INACTIVE_DAYS.min}
                max={INACTIVE_DAYS.max}
                className="w-28"
                aria-invalid={errors.inactiveDays !== undefined}
                aria-describedby={describedBy(`${id}-days`, { error: errors.inactiveDays?.message, hint: true })}
                {...register('inactiveDays', { valueAsNumber: true })}
              />
            </Field>
          )}

          <Field id={id} label={r.label} hint={r.hint} error={errors.message?.message}>
            <Textarea
              id={id}
              rows={4}
              maxLength={500}
              aria-invalid={errors.message !== undefined}
              aria-describedby={describedBy(id, { error: errors.message?.message, hint: true })}
              {...register('message')}
            />
          </Field>
          {isDefault && !isDirty && <p className="text-muted-foreground -mt-2 text-sm">{r.recommended}</p>}

          <figure className="grid gap-1.5">
            <figcaption className="text-sm font-medium">{r.previewTitle}</figcaption>
            <p className="bg-muted rounded-lg px-4 py-3 text-sm break-words whitespace-pre-line">{preview}</p>
          </figure>

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t.loyalty.program.saving : r.save}
            </Button>
            {!isDefault && (
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => void save({ [fields.message]: '' }, r.restored)}
              >
                {r.useRecommended}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
