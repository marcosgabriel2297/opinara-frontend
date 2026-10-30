import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: ReactNode;
  /** Un link o una acción chica a la derecha del título ("Ver todas"). */
  action?: ReactNode;
  /** Nivel del encabezado: casi siempre `h2`. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * Comienzo de una sección: versalitas chicas sobre una línea de tinta. Reemplaza a la tarjeta como
 * forma de agrupar; lo que sigue se separa con líneas finas (`divide-y`).
 */
export function SectionTitle({ children, action, as: Heading = 'h2', className }: SectionTitleProps) {
  return (
    <div className={cn('border-foreground flex items-baseline justify-between gap-4 border-b pb-2.5', className)}>
      <Heading className="text-xs font-semibold tracking-[0.08em] uppercase">{children}</Heading>
      {action !== undefined && <div className="text-sm font-medium">{action}</div>}
    </div>
  );
}
