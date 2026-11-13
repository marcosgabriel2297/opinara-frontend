import { MessageSquareIcon, QrCodeIcon, SettingsIcon, StampIcon, SunIcon } from 'lucide-react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';

import { Wordmark } from '@/components/brand-mark';
import { OpinaraSignature } from '@/components/opinara-signature';
import { UserMenu } from '@/features/auth/components/user-menu';
import { BusinessLogo } from '@/features/businesses/components/business-logo';
import { hasFeature } from '@/features/businesses/api/schemas';
import { BusinessSwitcher } from '@/features/businesses/components/business-switcher';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { ConnectionBanner } from '@/features/google/components/connection-banner';
import { useReviewsSummary } from '@/features/reviews/queries';
import { plural, t } from '@/i18n';
import { cn } from '@/lib/utils';

import { paths } from '../paths';

const navItems = [
  // "Hoy" es el resumen de las reseñas: sin reseñas en el plan, la portada es la tarjeta de sellos.
  { to: paths.home, label: t.nav.home, icon: SunIcon, end: true, reviewsOnly: true },
  { to: paths.reviews, label: t.nav.reviews, icon: MessageSquareIcon, end: false, pending: true },
  { to: paths.campaigns, label: t.nav.campaigns, icon: QrCodeIcon, end: false },
  // Visible aunque el plan no la incluya: la sección explica qué es y cómo sumarla.
  { to: paths.loyalty, label: t.nav.loyalty, icon: StampIcon, end: false },
  { to: paths.settings, label: t.nav.settings, icon: SettingsIcon, end: false, last: true },
];

/**
 * Layout del dashboard. La landing pública y el modo foco no pasan por acá.
 *
 * Un solo `<aside>` y un solo `<nav>` para todos los tamaños, así un lector de pantalla no
 * encuentra la navegación repetida:
 * - desde `lg`, una columna fija a la izquierda: la marca, el negocio, las secciones y la cuenta;
 * - debajo, el `aside` es la barra de arriba (marca y negocio) y el `nav` baja a una barra fija
 *   al alcance del pulgar. La cuenta vive en Configuración.
 */
export function DashboardLayout() {
  const business = useCurrentBusiness();
  const withReviews = hasFeature(business, 'REVIEWS');
  // Sin reseñas en el plan no se pide el contador: el backend respondería 403 en cada pantalla.
  const summaryQuery = useReviewsSummary(business.urn, withReviews);
  const items = navItems.filter((item) => withReviews || item.reviewsOnly !== true);
  const pending = summaryQuery.data?.unanswered ?? 0;

  return (
    <div className="min-h-dvh lg:flex">
      <aside
        className={cn(
          // `chrome` y `tabbar`: capas propias en la transición entre secciones, para que el contenido
          // que se anima no les pase por encima (ver `index.css`).
          'bg-background sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 [view-transition-name:chrome]',
          'lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-7 lg:border-r lg:border-b-0 lg:px-4 lg:py-7',
        )}
      >
        {/* Arriba va el negocio: su logo, o el de Opinara si no cargó uno. Opinara queda como firma. */}
        <NavLink to={paths.home} viewTransition className="inline-flex shrink-0 rounded-md lg:px-2">
          <BusinessLogo
            business={business}
            fallback={<Wordmark compact />}
            className="h-8 max-w-28 lg:h-auto lg:max-h-14 lg:max-w-full"
          />
        </NavLink>

        <div className="ml-auto min-w-0 lg:ml-0">
          <BusinessSwitcher />
        </div>

        <nav
          aria-label={t.nav.sections}
          className={cn(
            'no-imprimir bg-card fixed inset-x-0 bottom-0 z-20 grid border-t pb-[env(safe-area-inset-bottom)] [view-transition-name:tabbar]',
            items.length === 5 ? 'grid-cols-5' : 'grid-cols-4',
            'lg:static lg:flex lg:flex-1 lg:flex-col lg:gap-0.5 lg:border-0 lg:bg-transparent lg:pb-0',
          )}
        >
          {items.map(({ to, label, icon: Icon, end, pending: showsPending, last }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs transition-[color,background-color]',
                  'lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[0.9375rem]',
                  // En el teléfono, la marca de activo es una línea arriba; en escritorio, el fondo.
                  'after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full lg:after:hidden',
                  last && 'lg:mt-auto',
                  isActive
                    ? 'text-brand-strong after:bg-primary lg:bg-brand-soft font-semibold'
                    : 'text-muted-foreground hover:text-foreground lg:hover:bg-accent',
                )
              }
            >
              <Icon aria-hidden className="size-5 lg:size-[1.125rem]" />
              <span className="lg:flex-1">{label}</span>
              {showsPending && pending > 0 && (
                <span
                  className={cn(
                    'bg-foreground text-background flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums',
                    'absolute top-1.5 left-[calc(50%+0.375rem)] lg:static',
                  )}
                >
                  <span aria-hidden>{pending}</span>
                  <span className="sr-only">, {plural(pending, t.nav.pendingBadge)}</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <UserMenu className="hidden lg:flex" />
      </aside>

      {/* Debajo de `lg` el contenido deja lugar para la barra de abajo. `page` es lo único que se
          anima al cambiar de sección (ver las transiciones en `index.css`). */}
      <main className="min-w-0 flex-1 [view-transition-name:page]">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-8 md:pt-10 lg:px-12 lg:pb-16">
          <ConnectionBanner />
          <Outlet />
        </div>
      </main>

      {/* En el teléfono, encima de la barra de abajo. */}
      <OpinaraSignature className="bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:right-5 lg:bottom-5" />

      {/* Cada sección abre arriba de todo; al volver atrás, donde estaba. */}
      <ScrollRestoration />
    </div>
  );
}
