import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Estado de algo (reseña, campaña, conexión). Los semánticos llevan un punto del color del estado:
 * así el estado no depende solo del tono del fondo, y en una lista se escanea por la forma.
 */
const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground border-transparent',
        success: 'bg-success-soft text-success border-success/25 before:bg-success',
        warning: 'bg-warning-soft text-warning-strong border-warning/40 before:bg-warning',
        destructive: 'bg-destructive-soft text-destructive border-destructive/25 before:bg-destructive',
        outline: 'bg-card text-muted-foreground before:bg-input',
      },
      dot: {
        true: 'before:size-1.5 before:shrink-0 before:rounded-full before:content-[""]',
        false: '',
      },
    },
    compoundVariants: [{ variant: 'default', dot: true, className: 'before:hidden' }],
    defaultVariants: { variant: 'default', dot: true },
  },
);

export function Badge({
  className,
  variant,
  dot,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, dot }), className)} {...props} />;
}
