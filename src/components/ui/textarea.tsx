import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Mismo aspecto que `Input`, para texto largo. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground w-full min-w-0 rounded-md border px-3 py-2 text-base leading-relaxed md:text-sm',
        'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
