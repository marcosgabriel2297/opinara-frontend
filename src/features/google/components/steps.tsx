import { CheckIcon } from 'lucide-react';

import { t } from '@/i18n';
import { cn } from '@/lib/utils';

const STEPS = [t.google.steps.connect, t.google.steps.account, t.google.steps.locations];

/** `current` para cuando ya se hicieron los tres pasos: todos tildados, ninguno en curso. */
export const ALL_STEPS_DONE = 4;

/**
 * Indicador de progreso del onboarding de Google. `current` es 1-based.
 *
 * Tres segmentos de igual ancho: entran en un teléfono sin cortarse y el avance se ve de un
 * vistazo (la barra), además del número o el tilde y el peso del texto.
 *
 * Para lectores de pantalla: la lista se llama "Paso N de 3" (o "Los tres pasos están hechos"),
 * el paso en curso lleva `aria-current` en su `li`, y los hechos lo dicen en texto (el tilde es
 * solo visual).
 */
export function Steps({ current }: { current: number }) {
  const label =
    current > STEPS.length
      ? t.google.steps.allDone
      : t.google.steps.of.replace('{current}', String(current)).replace('{total}', String(STEPS.length));

  return (
    <ol className="mb-8 grid max-w-3xl grid-cols-3 gap-2 text-sm sm:gap-3" aria-label={label}>
      {STEPS.map((stepLabel, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;

        return (
          <li key={stepLabel} className="grid content-start gap-2" aria-current={active ? 'step' : undefined}>
            <span
              aria-hidden
              className={cn('h-1 rounded-full', done ? 'bg-success' : active ? 'bg-primary' : 'bg-border')}
            />
            <span className="flex items-start gap-2">
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  done && 'bg-success-soft border-success/40 text-success',
                  active && 'bg-primary text-primary-foreground border-transparent',
                  !done && !active && 'text-muted-foreground bg-card',
                )}
              >
                {done ? <CheckIcon className="size-3" /> : step}
              </span>
              <span className={cn('leading-5', active ? 'font-medium' : 'text-muted-foreground')}>
                {stepLabel}
                {done && <span className="sr-only">{t.google.steps.doneSuffix}</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
