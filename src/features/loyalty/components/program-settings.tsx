import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Field } from '@/components/field';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage, t } from '@/i18n';
import { describedBy } from '@/lib/described-by';

import { type LoyaltyProgram } from '../api/schemas';
import { editProgramSchema, type EditProgramValues } from '../api/validation';
import { useUpdateProgram } from '../queries';
import { RewardFields } from './create-program-form';

/** Premio, sellos, condiciones y tiempo mínimo; y pausar o reactivar. Solo OWNER y ADMIN. */
export function ProgramSettings({ businessUrn, program }: { businessUrn: string; program: LoyaltyProgram }) {
  const updateMutation = useUpdateProgram(businessUrn, program.urn);
  const toast = useToast();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditProgramValues>({
    resolver: zodResolver(editProgramSchema),
    defaultValues: {
      rewardDescription: program.rewardDescription,
      stampsRequired: program.stampsRequired,
      terms: program.terms ?? '',
      stampCooldownMinutes: program.stampCooldownMinutes,
    },
  });
  const stamps = useWatch({ control, name: 'stampsRequired' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const updated = await updateMutation.mutateAsync(values);
      reset({
        rewardDescription: updated.rewardDescription,
        stampsRequired: updated.stampsRequired,
        terms: updated.terms ?? '',
        stampCooldownMinutes: updated.stampCooldownMinutes,
      });
      toast.show({ message: t.loyalty.program.saved });
    } catch (error) {
      setSubmitError(error);
    }
  });

  const toggleStatus = async () => {
    setSubmitError(null);
    try {
      await updateMutation.mutateAsync({ status: program.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' });
    } catch (error) {
      setSubmitError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.loyalty.program.settingsTitle}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submitError !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage(submitError)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
          <RewardFields register={register} errors={errors} idPrefix="edit-program" />

          {/* Si cambian los sellos, que se sepa antes de guardar a quién afecta. */}
          {Number.isFinite(stamps) && stamps !== program.stampsRequired && (
            <Alert variant="warning">
              <AlertDescription>{t.loyalty.program.stampsChangeWarning}</AlertDescription>
            </Alert>
          )}

          <Field
            id="edit-program-cooldown"
            label={t.loyalty.fields.cooldown}
            hint={t.loyalty.fields.cooldownHint}
            error={errors.stampCooldownMinutes?.message}
          >
            <Input
              id="edit-program-cooldown"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              className="w-28"
              aria-invalid={errors.stampCooldownMinutes !== undefined}
              aria-describedby={describedBy('edit-program-cooldown', {
                error: errors.stampCooldownMinutes?.message,
                hint: true,
              })}
              {...register('stampCooldownMinutes', { valueAsNumber: true })}
            />
          </Field>

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t.loyalty.program.saving : t.loyalty.program.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => void toggleStatus()}
            >
              {program.status === 'ACTIVE' ? t.loyalty.program.pause : t.loyalty.program.resume}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
