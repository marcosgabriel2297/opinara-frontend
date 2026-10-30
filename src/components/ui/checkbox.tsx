import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Checkbox nativo estilado: accesible de fábrica y sin dependencias. */
export function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-input accent-primary size-4 shrink-0 rounded-sm border disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
