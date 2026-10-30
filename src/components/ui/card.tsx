import { Slot } from '@radix-ui/react-slot';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Superficie blanca sobre el lienzo, delimitada por borde y sin sombra. No se anidan: adentro de
 * una card las secciones se separan con `divide-y`, no con otra card.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground flex flex-col gap-4 rounded-lg border py-5', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1 px-5', className)} {...props} />;
}

/**
 * Por defecto es un `div` como en shadcn, pero con `asChild` se renderiza el hijo: cuando el
 * título de la card es el título de la pantalla tiene que ser un `<h1>` de verdad, no un div.
 */
export function CardTitle({ className, asChild = false, ...props }: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div';

  return <Comp data-slot="card-title" className={cn('text-base leading-snug font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center px-5', className)} {...props} />;
}
