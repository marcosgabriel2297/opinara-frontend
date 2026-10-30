import { type RouteObject } from 'react-router';

import { LegacyRedirect, type Translate } from './legacy-redirect';
import { googleLocationsQuery, paths, repliedValues, reviewsQuery, routePatterns } from './paths';

/**
 * Las URLs viejas (en español) siguen andando: redirigen a la nueva con `replace`, así el "atrás"
 * no rebota contra el redirect.
 *
 * Por qué existen y hasta cuándo:
 * - `/configuracion/google/conectado` es **obligatoria**: es la vuelta del consentimiento de
 *   Google, y la URL la tiene el backend en `GOOGLE_OAUTH_SUCCESS_URL`/`GOOGLE_OAUTH_ERROR_URL`.
 *   Se va recién cuando esas variables apunten a `/settings/google/callback` en todos los
 *   ambientes. Conserva `?error=` (el negocio pendiente viaja en `sessionStorage`, no en la URL).
 * - El resto cubre favoritos, historial y links compartidos (sobre todo filtros de reseñas). Se
 *   revisan junto con la de arriba.
 *
 * Van fuera de los guards: primero se traduce la URL y después la ruta nueva decide si hace falta
 * sesión, así el "volvé a donde ibas" del login guarda la URL nueva.
 */

/** Nombre nuevo del parámetro y, si sus valores también estaban en español, su traducción. */
type Rename = string | { to: string; values: Record<string, string> };

/** Copia solo los parámetros conocidos, con su nombre nuevo. Lo que no se reconoce se descarta. */
function translateQuery(search: URLSearchParams, rename: Record<string, Rename>) {
  const next = new URLSearchParams();
  for (const [oldKey, target] of Object.entries(rename)) {
    const value = search.get(oldKey);
    if (value === null) continue;
    if (typeof target === 'string') {
      next.set(target, value);
      continue;
    }
    // Un valor que no se reconoce se descarta: mejor sin ese filtro que con uno inválido.
    const translated = Object.hasOwn(target.values, value) ? target.values[value] : undefined;
    if (translated !== undefined) next.set(target.to, translated);
  }
  const query = next.toString();
  return query === '' ? '' : `?${query}`;
}

const keepQuery = (search: URLSearchParams) => (search.size === 0 ? '' : `?${search.toString()}`);

const legacy: [string, Translate][] = [
  ['/ingresar', (_, search) => paths.login + keepQuery(search)],
  // Ya no hay registro: las cuentas las crea un administrador. Los links viejos caen en el login.
  ['/crear-cuenta', (_, search) => paths.login + keepQuery(search)],
  ['/sign-up', (_, search) => paths.login + keepQuery(search)],
  [
    '/resenas',
    (_, search) =>
      paths.reviews +
      translateQuery(search, {
        sucursal: reviewsQuery.location,
        estrellas: reviewsQuery.rating,
        // El único con valores en español; los otros son URN y números.
        respondidas: { to: reviewsQuery.replied, values: { si: repliedValues.yes, no: repliedValues.no } },
        pagina: reviewsQuery.page,
      }),
  ],
  ['/resenas/:locationUrn/:reviewUrn', (p) => paths.review(p.locationUrn ?? '', p.reviewUrn ?? '')],
  ['/campanas', () => paths.campaigns],
  ['/campanas/:campaignUrn', (p) => paths.campaign(p.campaignUrn ?? '')],
  ['/configuracion', () => paths.settings],
  ['/configuracion/google', () => paths.google],
  ['/configuracion/google/conectado', (_, search) => paths.googleCallback + keepQuery(search)],
  ['/configuracion/google/cuentas', () => paths.googleAccounts],
  [
    '/configuracion/google/sucursales',
    (_, search) => routePatterns.googleLocations + translateQuery(search, { cuenta: googleLocationsQuery.account }),
  ],
];

export const legacyRoutes: RouteObject[] = legacy.map(([path, to]) => ({ path, element: <LegacyRedirect to={to} /> }));
