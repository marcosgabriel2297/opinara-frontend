import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Lugar de algo que está cargando. Solo visual: el anuncio lo hace un `Spinner` o un `sr-only`. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
