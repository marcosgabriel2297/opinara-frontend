import { createBrowserRouter, type RouteObject } from 'react-router';

import { FullPageLoader } from '@/components/full-page-loader';
import { RequireAnonymous, RequireAuth } from '@/features/auth/guards';
import { BusinessProvider } from '@/features/businesses/business-provider';
import { RequireBusiness } from '@/features/businesses/require-business';
import { RequireFeature } from '@/features/businesses/require-feature';
import { ReviewsUpsell } from '@/features/reviews/components/reviews-upsell';

import { AuthLayout } from './layouts/auth-layout';
import { DashboardLayout } from './layouts/dashboard-layout';
import { legacyRoutes } from './legacy-routes';
import { routePatterns } from './paths';
import { RouteErrorBoundary } from './route-error-boundary';

/** Una sola página de "no disponible" para las dos URLs que la muestran. */
const unavailableRoute = async () => ({
  Component: (await import('@/features/public-landing/routes/unavailable-route')).default,
});

/**
 * Los paths salen de `paths.ts` (en inglés); las URLs viejas en español redirigen desde
 * `legacy-routes.tsx`.
 *
 * Todo se carga con `lazy` para que cada sección sea su propio chunk. Importa sobre todo
 * para `/r/:businessSlug/:campaignSlug`, que no debe arrastrar el bundle del dashboard.
 *
 * Por eso cada rama de primer nivel declara `hydrateFallbackElement`: mientras baja el chunk
 * de la ruta inicial hay algo que mostrar (y React Router deja de advertir en la consola).
 */
export const routes: RouteObject[] = [
  // Las dos URLs de "no disponible" muestran la misma página, sin redirección de por medio: el
  // backend manda a `/r/no-disponible` (lo tiene escrito en su código) y esa URL no puede romperse.
  // Antes que `/r/:businessSlug/:campaignSlug` por claridad; igual no chocan (dos segmentos vs. tres).
  {
    path: routePatterns.publicUnavailable,
    lazy: unavailableRoute,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    path: routePatterns.publicUnavailableLegacy,
    lazy: unavailableRoute,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    // Pasado el límite de escaneos, el backend manda acá en vez de responder un 429.
    path: routePatterns.publicCampaignBusy,
    lazy: async () => ({ Component: (await import('@/features/public-landing/routes/busy-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    // Lo que codifica el QR impreso: no se cambia.
    path: routePatterns.publicCampaign,
    lazy: async () => ({ Component: (await import('@/features/public-landing/routes/landing-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    // Lo que codifica el QR de alta de la tarjeta de sellos: va impreso, no se cambia.
    path: routePatterns.loyaltySignup,
    lazy: async () => ({ Component: (await import('@/features/loyalty/routes/signup-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    // La tarjeta del cliente: pública, sin sesión de Opinara.
    path: routePatterns.loyaltyCard,
    lazy: async () => ({ Component: (await import('@/features/loyalty/routes/card-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    // Con o sin sesión, y sin layout de la app: las lee Google y quien todavía no tiene cuenta.
    path: routePatterns.privacy,
    lazy: async () => ({ Component: (await import('@/features/legal/routes/privacy-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    path: routePatterns.terms,
    lazy: async () => ({ Component: (await import('@/features/legal/routes/terms-route')).default }),
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
  },
  {
    element: <RequireAnonymous />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: routePatterns.login,
            lazy: async () => ({ Component: (await import('@/features/auth/routes/login-route')).default }),
          },
          {
            path: routePatterns.forgotPassword,
            lazy: async () => ({
              Component: (await import('@/features/auth/routes/forgot-password-route')).default,
            }),
          },
        ],
      },
    ],
  },
  {
    // Con o sin sesión: el link del mail puede abrirse en un navegador que ya tiene una sesión
    // abierta (cambiar la contraseña o aceptar una invitación con otra cuenta).
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        path: routePatterns.resetPassword,
        lazy: async () => ({ Component: (await import('@/features/auth/routes/reset-password-route')).default }),
      },
      {
        path: routePatterns.invitation,
        lazy: async () => ({ Component: (await import('@/features/team/routes/invitation-route')).default }),
      },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        // Con sesión pero sin el dashboard: hasta cambiar la contraseña provisoria no hay negocio que mostrar.
        element: <AuthLayout />,
        children: [
          {
            path: routePatterns.changePassword,
            lazy: async () => ({
              Component: (await import('@/features/auth/routes/change-password-route')).default,
            }),
          },
        ],
      },
      {
        // Los negocios del usuario se cargan una sola vez, acá: todo lo de adentro los da por hecho.
        element: <BusinessProvider />,
        children: [
          {
            path: routePatterns.onboarding,
            lazy: async () => ({ Component: (await import('@/features/businesses/routes/onboarding-route')).default }),
          },
          {
            element: <RequireBusiness />,
            children: [
              {
                // El modo foco ocupa la pantalla entera: sin la navegación, solo la fila de reseñas.
                element: (
                  <RequireFeature
                    feature="REVIEWS"
                    fallback={
                      <main className="mx-auto max-w-3xl px-4 py-10">
                        <ReviewsUpsell />
                      </main>
                    }
                  />
                ),
                children: [
                  {
                    path: routePatterns.replyQueue,
                    lazy: async () => ({
                      Component: (await import('@/features/reviews/routes/reply-queue-route')).default,
                    }),
                  },
                ],
              },
              {
                // La caja de la tarjeta de sellos, igual: pantalla completa para el mostrador.
                path: routePatterns.loyaltyRegister,
                lazy: async () => ({
                  Component: (await import('@/features/loyalty/routes/register-route')).default,
                }),
              },
              {
                path: routePatterns.home,
                element: <DashboardLayout />,
                children: [
                  { index: true, lazy: async () => ({ Component: (await import('@/routes/home')).default }) },
                  {
                    // Reseñas y campañas de QR: solo con reseñas en el plan (hay un plan de solo fidelización).
                    element: <RequireFeature feature="REVIEWS" fallback={<ReviewsUpsell />} />,
                    children: [
                      {
                        path: routePatterns.reviews,
                        lazy: async () => ({
                          Component: (await import('@/features/reviews/routes/reviews-route')).default,
                        }),
                      },
                      {
                        path: routePatterns.review,
                        lazy: async () => ({
                          Component: (await import('@/features/reviews/routes/review-detail-route')).default,
                        }),
                      },
                      {
                        path: routePatterns.campaigns,
                        lazy: async () => ({
                          Component: (await import('@/features/campaigns/routes/campaigns-route')).default,
                        }),
                      },
                      {
                        path: routePatterns.campaign,
                        lazy: async () => ({
                          Component: (await import('@/features/campaigns/routes/campaign-detail-route')).default,
                        }),
                      },
                    ],
                  },
                  {
                    path: routePatterns.loyalty,
                    lazy: async () => ({
                      Component: (await import('@/features/loyalty/routes/loyalty-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.loyaltyReminders,
                    lazy: async () => ({
                      Component: (await import('@/features/loyalty/routes/reminders-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.loyaltyProgram,
                    lazy: async () => ({
                      Component: (await import('@/features/loyalty/routes/program-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.settings,
                    lazy: async () => ({ Component: (await import('@/routes/settings')).default }),
                  },
                  {
                    path: routePatterns.newLocation,
                    lazy: async () => ({
                      Component: (await import('@/features/locations/routes/new-location-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.google,
                    lazy: async () => ({ Component: (await import('@/features/google/routes/google-route')).default }),
                  },
                  {
                    path: routePatterns.googleCallback,
                    lazy: async () => ({
                      Component: (await import('@/features/google/routes/callback-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.googleAccounts,
                    lazy: async () => ({
                      Component: (await import('@/features/google/routes/accounts-route')).default,
                    }),
                  },
                  {
                    path: routePatterns.googleLocations,
                    lazy: async () => ({
                      Component: (await import('@/features/google/routes/import-locations-route')).default,
                    }),
                  },
                  { path: '*', lazy: async () => ({ Component: (await import('@/routes/not-found')).default }) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    errorElement: <RouteErrorBoundary />,
    children: legacyRoutes,
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
