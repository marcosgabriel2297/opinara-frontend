import { type ReactNode } from 'react';

import { OpinaraSignature } from '@/components/opinara-signature';
import { logoUrl } from '@/features/businesses/logo';
import { useNoIndex } from '@/features/public-landing/hooks/use-no-index';

interface PublicShellProps {
  /** El negocio, para el logo y el nombre de arriba; sin él (cargando o error) solo va el contenido. */
  business?: { name: string; slug: string; logoUpdatedAt: string | null } | undefined;
  subtitle?: string | undefined;
  children: ReactNode;
}

/**
 * Las pantallas que ve el cliente del comercio (alta y tarjeta). Con la fuente del sistema, como la
 * del QR de reseñas: se abre con datos móviles. Arriba va el comercio, que es lo que reconoce.
 */
export function PublicShell({ business, subtitle, children }: PublicShellProps) {
  useNoIndex();
  const logo = business === undefined ? null : logoUrl(business);

  return (
    <main className="font-system mx-auto grid min-h-dvh w-full max-w-md content-start gap-6 px-5 pt-8 pb-20">
      {business !== undefined && (
        <header className="grid justify-items-center gap-2 text-center">
          {logo !== null && <img src={logo} alt="" className="max-h-20 max-w-48 object-contain" />}
          <p className="text-xl font-semibold">{business.name}</p>
          {subtitle !== undefined && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </header>
      )}
      {children}
      <OpinaraSignature system className="bottom-[calc(0.75rem+env(safe-area-inset-bottom))]" />
    </main>
  );
}
