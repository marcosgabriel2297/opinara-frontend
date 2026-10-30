import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface MetricProps {
  label: string;
  value: ReactNode;
  /** Qué cuenta exactamente el número: sin esto una cifra suelta no dice nada. */
  hint?: ReactNode;
  /** `brand`: la cifra es un dato propio del negocio (escaneos, reseñas). */
  tone?: 'default' | 'brand' | 'warning';
  className?: string | undefined;
}

/** Una cifra con su etiqueta y su contexto. Es un `<dl>` para que se lea como par nombre-valor. */
export function Metric({ label, value, hint, tone = 'default', className }: MetricProps) {
  return (
    <dl className={cn('grid content-start gap-1', className)}>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={cn(
          'text-2xl leading-none font-semibold tracking-tight tabular-nums',
          tone === 'brand' && 'text-brand-strong',
          tone === 'warning' && 'text-warning-strong',
        )}
      >
        {value}
      </dd>
      {hint !== undefined && <dd className="text-muted-foreground text-xs">{hint}</dd>}
    </dl>
  );
}
