import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  /** Qué significa que esté vacío y qué hacer para que deje de estarlo. */
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Lista sin nada. Ocupa el lugar de la lista (misma superficie), así la pantalla no cambia de forma
 * cuando llega el primer dato, y orienta con una sola acción.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-card flex flex-col items-center justify-center gap-2 rounded-lg border px-6 py-12 text-center',
        className,
      )}
    >
      {icon !== undefined && (
        <div className="bg-muted text-muted-foreground mb-2 flex size-11 items-center justify-center rounded-lg [&_svg]:size-5">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description !== undefined && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action !== undefined && <div className="mt-3">{action}</div>}
    </div>
  );
}
