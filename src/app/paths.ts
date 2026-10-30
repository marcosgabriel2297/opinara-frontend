/**
 * Las URLs de la app, en un solo lugar.
 *
 * Van en inglés aunque la interfaz esté en español: el idioma de la URL es una convención del
 * código, no del producto. Cualquier link, redirección o guard las toma de acá; nadie arma una
 * ruta a mano.
 *
 * Las rutas públicas del QR (`/r/...`) no siguen esa convención y no se pueden cambiar: las genera
 * el backend y ya están impresas. Ver `legacy-routes.tsx` para las URLs viejas que siguen andando.
 */

const enc = encodeURIComponent;

/** Patrones para el router. Los parámetros son URN (no IDs) o slugs públicos. */
export const routePatterns = {
  home: '/',
  login: '/login',
  /** El primer ingreso: cambiar la contraseña provisoria que dio el administrador. */
  changePassword: '/change-password',
  forgotPassword: '/forgot-password',
  /** Llega desde el mail; el token viene después de `#`. */
  resetPassword: '/reset-password',
  /** Llega desde el mail de invitación (o el link que copió quien invita); el token, después de `#`. */
  invitation: '/invitations',
  /** Públicas, con o sin sesión: Google las enlaza desde la pantalla de consentimiento. */
  privacy: '/privacy',
  terms: '/terms',
  onboarding: '/onboarding',
  reviews: '/reviews',
  /** El modo foco: responder las pendientes de a una. */
  replyQueue: '/reviews/respond',
  review: '/reviews/:locationUrn/:reviewUrn',
  campaigns: '/campaigns',
  campaign: '/campaigns/:campaignUrn',
  settings: '/settings',
  /** Alta manual de una sucursal, con su Place ID. */
  newLocation: '/settings/locations/new',
  google: '/settings/google',
  googleCallback: '/settings/google/callback',
  googleAccounts: '/settings/google/accounts',
  googleLocations: '/settings/google/locations',
  /** Lo que codifica el QR impreso. No se toca. */
  publicCampaign: '/r/:businessSlug/:campaignSlug',
  /** A donde manda el backend cuando hay demasiados escaneos seguidos: espera y reintenta. */
  publicCampaignBusy: '/r/:businessSlug/:campaignSlug/espera',
  publicUnavailable: '/r/unavailable',
  /** Adonde redirige hoy el backend (lo tiene escrito en su código): alias permanente. */
  publicUnavailableLegacy: '/r/no-disponible',
} as const;

/** Query params de los filtros de reseñas. */
export const reviewsQuery = {
  location: 'location',
  rating: 'rating',
  replied: 'replied',
  page: 'page',
} as const;

/** Valores de `replied`. */
export const repliedValues = { yes: 'yes', no: 'no' } as const;

/** Query param de la cuenta de Google en la importación de sucursales. */
export const googleLocationsQuery = { account: 'account' } as const;

/** URLs listas para navegar. */
export const paths = {
  home: routePatterns.home,
  login: routePatterns.login,
  changePassword: routePatterns.changePassword,
  forgotPassword: routePatterns.forgotPassword,
  resetPassword: routePatterns.resetPassword,
  invitation: routePatterns.invitation,
  privacy: routePatterns.privacy,
  terms: routePatterns.terms,
  onboarding: routePatterns.onboarding,
  reviews: routePatterns.reviews,
  replyQueue: routePatterns.replyQueue,
  review: (locationUrn: string, reviewUrn: string) => `/reviews/${enc(locationUrn)}/${enc(reviewUrn)}`,
  campaigns: routePatterns.campaigns,
  campaign: (campaignUrn: string) => `/campaigns/${enc(campaignUrn)}`,
  settings: routePatterns.settings,
  newLocation: routePatterns.newLocation,
  google: routePatterns.google,
  googleCallback: routePatterns.googleCallback,
  googleAccounts: routePatterns.googleAccounts,
  googleLocations: (accountName: string) =>
    `${routePatterns.googleLocations}?${googleLocationsQuery.account}=${enc(accountName)}`,
  /** Solo para mostrar o previsualizar: la URL que va en el QR la arma el backend. */
  publicBusiness: (businessSlug: string) => `/r/${businessSlug}`,
  publicCampaign: (businessSlug: string, campaignSlug: string) => `/r/${businessSlug}/${campaignSlug}`,
} as const;
