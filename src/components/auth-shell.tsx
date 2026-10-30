import { type ReactNode } from 'react';

import { Wordmark } from '@/components/brand-mark';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Pantallas fuera del dashboard (login, registro, alta del negocio): la marca arriba y una sola
 * columna con el formulario. Lo comparten para que entrar y empezar se sientan el mismo producto.
 */
export function AuthShell({
  children,
  wide = false,
  footer,
}: {
  children: ReactNode;
  wide?: boolean;
  /** Debajo de todo, chico: lo usan login y registro para los links legales. */
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center sm:py-16">
      <div className={cn('w-full', wide ? 'max-w-md' : 'max-w-sm')}>
        <div className="mb-8 grid justify-items-center gap-2 text-center">
          <Wordmark className="text-xl [&>svg]:size-8" />
          <p className="text-muted-foreground text-sm">{t.app.tagline}</p>
        </div>

        {children}

        {footer !== undefined && <div className="text-muted-foreground mt-8 text-xs">{footer}</div>}
      </div>
    </div>
  );
}
