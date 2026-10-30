import { ChevronDownIcon } from 'lucide-react';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * `<select>` nativo con el mismo aspecto que `Input`.
 *
 * Nativo a propósito: en un teléfono abre el selector del sistema, es accesible de fábrica y no
 * suma dependencias. La flecha es propia (`appearance-none`) para que se vea igual en todos los
 * navegadores. `className` va al envoltorio: es el que define el ancho.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className={cn('relative inline-flex min-w-0', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'border-input bg-card h-11 w-full min-w-0 appearance-none truncate rounded-md border pr-9 pl-3 text-base md:h-9 md:text-sm',
          'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </span>
  );
}
