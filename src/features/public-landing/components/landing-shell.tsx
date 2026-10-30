import { useState, type ReactNode } from 'react';

import { OpinaraSignature } from '@/components/opinara-signature';
import { publicLogoUrl } from '@/features/businesses/logo';
import { cn } from '@/lib/utils';

/**
 * La pantalla que abre el QR. Con la fuente del sistema (`font-system`), no la del producto:
 * quien escanea está con datos móviles y solo pasa camino a Google.
 *
 * Con `businessSlug`, arriba va el logo del negocio: es lo que el cliente reconoce. Se pide en
 * paralelo con la redirección (no la demora) y aparece solo si existe y llega a cargar; sin logo
 * no se muestra nada en su lugar, porque Opinara ya está en la firma de abajo.
 */
export function LandingShell({ children, businessSlug }: { children: ReactNode; businessSlug?: string }) {
  return (
    <main
      className={cn(
        'font-system mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5 py-8 pb-16',
        // La pantalla de "Te llevamos a Google…": logo y aviso, centrados uno sobre otro.
        businessSlug !== undefined && 'items-center text-center',
      )}
    >
      {businessSlug !== undefined && <LandingLogo businessSlug={businessSlug} />}
      {children}
      <OpinaraSignature system className="bottom-[calc(0.75rem+env(safe-area-inset-bottom))]" />
    </main>
  );
}

function LandingLogo({ businessSlug }: { businessSlug: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'missing'>('loading');
  if (state === 'missing') return null;

  return (
    <img
      src={publicLogoUrl(businessSlug)}
      alt=""
      onLoad={() => {
        setState('loaded');
      }}
      onError={() => {
        setState('missing');
      }}
      className={
        state === 'loaded'
          ? 'mb-2 max-h-24 max-w-56 object-contain'
          : // Mientras carga (o si no hay) no ocupa lugar: la pantalla no salta si no existe.
            'absolute size-0 opacity-0'
      }
    />
  );
}
