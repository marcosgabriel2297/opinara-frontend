import { t } from '@/i18n';
import { cn } from '@/lib/utils';

import { BrandMark } from './brand-mark';

/**
 * La firma de Opinara, fija abajo a la derecha: la pantalla es del negocio (su logo va arriba)
 * y la marca del producto queda como firma, chica y siempre en el mismo lugar.
 *
 * No recibe clicks (`pointer-events-none`): nunca tapa un botón que esté debajo. Es decorativa
 * para lectores de pantalla: el nombre del producto ya está en el título de la página.
 * La posición la da `className` (en el dashboard sube por encima de la barra del teléfono).
 *
 * `system`: con la fuente del sistema, para la pantalla del QR (no baja la tipografía de la app).
 */
export function OpinaraSignature({ className, system = false }: { className?: string; system?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        // `signature`: capa propia en la transición entre secciones, quieta y por encima del
        // contenido que se anima (ver `index.css`).
        'no-imprimir pointer-events-none fixed right-3 z-30 inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-2 [view-transition-name:signature]',
        'bg-card/85 text-foreground shadow-[0_1px_2px_rgb(23_32_30/0.06),0_4px_12px_-4px_rgb(23_32_30/0.12)] backdrop-blur-sm',
        className,
      )}
    >
      <BrandMark className="size-4" />
      <span
        className={cn(
          'text-[0.8125rem] leading-none',
          system ? 'font-semibold tracking-tight' : 'font-display font-medium tracking-[-0.01em]',
        )}
      >
        {t.app.name}
      </span>
    </div>
  );
}
