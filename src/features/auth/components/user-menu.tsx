import { LogOutIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

import { useAuth } from '../use-auth';

/** Hasta dos iniciales del nombre: "Lucía Fernández" → "LF". */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase('es-AR') ?? '')
    .join('');
}

/**
 * Identidad y salida, al pie de la columna lateral. Salir revoca la sesión en el backend: los
 * tokens de este dispositivo dejan de servir aunque alguien los haya copiado.
 */
export function UserMenu({ className }: { className?: string }) {
  const { state, logout } = useAuth();

  if (state.status !== 'authenticated') return null;

  return (
    <div className={cn('flex items-center gap-2 border-t pt-4', className)}>
      <span
        aria-hidden
        className="bg-brand-soft text-brand-strong flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      >
        {initialsOf(state.user.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" title={state.user.email}>
        {state.user.name}
      </span>
      <Button variant="ghost" size="icon" onClick={logout} aria-label={t.nav.logout} title={t.nav.logout}>
        <LogOutIcon aria-hidden />
      </Button>
    </div>
  );
}
