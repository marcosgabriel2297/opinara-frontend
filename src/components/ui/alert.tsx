import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Avisos dentro de la página. El fondo es opaco (`--*-soft`) y el texto va en tinta: el color del
 * estado queda en el borde y el ícono, así el contraste no depende de dónde caiga el aviso.
 */
const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground [&>svg]:text-muted-foreground',
        success: 'bg-success-soft border-success/30 [&>svg]:text-success',
        destructive: 'bg-destructive-soft border-destructive/30 [&>svg]:text-destructive',
        warning: 'bg-warning-soft border-warning/50 [&>svg]:text-warning-strong',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Alert({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('col-start-2 font-semibold', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-foreground/85 col-start-2 text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  );
}
