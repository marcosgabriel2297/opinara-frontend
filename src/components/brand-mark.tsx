import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * El símbolo de Opinara: una "O" que también es un globo de diálogo, la opinión.
 * El mismo trazo está en `public/favicon.svg`; si cambia uno, cambia el otro.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('text-brand size-6 shrink-0', className)}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.74 22.5 2.5 29.5 9.5 27.26A13 13 0 1 0 4.74 22.5ZM9.5 16a6.5 6.5 0 1 0 13 0 6.5 6.5 0 1 0-13 0Z"
      />
    </svg>
  );
}

/**
 * Símbolo + nombre. El nombre queda en el color del texto: el acento es solo el símbolo.
 *
 * `compact`: en pantallas chicas muestra solo el símbolo (el nombre sigue ahí para lectores de
 * pantalla). Lo usa la barra del dashboard, donde cada píxel de ancho cuenta en un teléfono.
 */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-base font-semibold tracking-tight', className)}>
      <BrandMark />
      <span className={cn('font-display text-[1.2em] font-medium tracking-[-0.01em]', compact && 'max-sm:sr-only')}>
        {t.app.name}
      </span>
    </span>
  );
}
