import { ArrowLeftIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link, type To } from 'react-router';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  /** Una oración sobre los datos o el objeto de la pantalla, no instrucciones de uso. */
  description?: ReactNode;
  /** Las acciones reales de la pantalla. En un teléfono bajan debajo del título. */
  actions?: ReactNode;
  /**
   * El regreso al listado del que se vino. Siempre el mismo lugar y la misma forma en todas las
   * pantallas de detalle: arriba del título, con la flecha.
   */
  back?: { to: To; label: string; state?: unknown };
  className?: string;
}

/** Título de pantalla: el único `h1`, con su bajada, sus acciones y, en un detalle, el regreso. */
export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 grid gap-3', className)}>
      {back !== undefined && <BackLink {...back} />}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="font-display text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] [overflow-wrap:anywhere] md:text-[2.5rem]">
            {title}
          </h1>
          {description !== undefined && <div className="text-muted-foreground text-sm">{description}</div>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/** El regreso de un detalle. Suelto solo mientras carga, cuando todavía no hay `PageHeader`. */
export function BackLink({ to, label, state }: { to: To; label: string; state?: unknown }) {
  return (
    <Link
      viewTransition
      to={to}
      state={state}
      className="no-imprimir text-muted-foreground hover:text-foreground -ml-1 inline-flex min-h-8 w-fit items-center gap-1.5 rounded-md px-1 text-sm"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
