import { http, HttpResponse } from 'msw';

import { paths } from '@/app/paths';
import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockGoogleAccount, mockGoogleLocations, mockImportedLocation } from '../fixtures';
import { mockState } from '../state';

const googleBase = `${API_BASE_URL}/businesses/:businessUrn/google`;

function requireConnection() {
  if (mockState.connection === null) {
    return HttpResponse.json(apiErrorBody(404, 'GOOGLE_CONNECTION_NOT_FOUND'), { status: 404 });
  }

  if (mockState.connection.status !== 'ACTIVE') {
    return HttpResponse.json(apiErrorBody(400, 'GOOGLE_CONNECTION_REVOKED'), { status: 400 });
  }

  return null;
}

export const googleHandlers = [
  http.get(`${googleBase}/connection`, () => {
    if (mockState.connection === null) {
      return HttpResponse.json(apiErrorBody(404, 'GOOGLE_CONNECTION_NOT_FOUND'), { status: 404 });
    }

    return HttpResponse.json({
      urn: 'urn:google-connection:mock',
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      connectedByUserUrn: 'urn:user:mock',
      ...mockState.connection,
    });
  }),

  http.post(`${googleBase}/connect`, () => {
    // Google de mentira: en vez de la pantalla de consentimiento, devolvemos directamente la URL
    // de vuelta del callback y damos la conexión por hecha. Sirve para recorrer el flujo entero
    // en el browser sin credenciales de Google. Usa la URL nueva, la que deberían tener
    // `GOOGLE_OAUTH_*_URL` en el backend; la vieja sigue andando por el redirect de compatibilidad.
    mockState.connection = { status: 'ACTIVE', connectedAt: new Date().toISOString() };

    return HttpResponse.json({
      authorizationUrl: `${location.origin}${paths.googleCallback}`,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });
  }),

  http.delete(`${googleBase}/connection`, () => {
    mockState.connection = null;

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${googleBase}/accounts`, () => requireConnection() ?? HttpResponse.json([mockGoogleAccount])),

  http.get(`${googleBase}/locations`, ({ request }) => {
    const failure = requireConnection();
    if (failure !== null) return failure;

    const accountName = new URL(request.url).searchParams.get('accountName');
    if (accountName !== mockGoogleAccount.name) return HttpResponse.json([]);

    return HttpResponse.json(
      mockGoogleLocations.map((location) => ({
        ...location,
        imported: mockState.importedLocationNames.has(location.name),
      })),
    );
  }),

  http.post(`${googleBase}/locations/import`, async ({ request }) => {
    const failure = requireConnection();
    if (failure !== null) return failure;

    const body = (await request.json()) as { locationNames?: string[] };
    const names = body.locationNames ?? [];

    for (const name of names) mockState.importedLocationNames.add(name);

    return HttpResponse.json(
      names.map((name) => ({
        urn: `urn:location:${name.replace('locations/', '')}`,
        title: mockGoogleLocations.find((location) => location.name === name)?.title ?? 'Sucursal',
        googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ficticio',
      })),
    );
  }),

  /** Alta manual: el link de reseña sale del Place ID, igual que en el backend. */
  http.post(`${API_BASE_URL}/businesses/:businessUrn/locations`, async ({ request }) => {
    const body = (await request.json()) as { title: string; placeId: string; address?: string };
    const taken =
      mockState.manualLocations.some((location) => location.placeId === body.placeId) ||
      mockGoogleLocations.some(
        (location) =>
          'placeId' in location &&
          location.placeId === body.placeId &&
          mockState.importedLocationNames.has(location.name),
      );
    if (taken) return HttpResponse.json(apiErrorBody(409, 'LOCATION_ALREADY_IMPORTED'), { status: 409 });

    const location = {
      urn: `urn:location:manual-${String(mockState.manualLocations.length + 1)}`,
      source: 'MANUAL' as const,
      title: body.title,
      ...(body.address === undefined ? {} : { address: body.address }),
      placeId: body.placeId,
      mapsUri: `https://www.google.com/maps/place/?q=place_id:${body.placeId}`,
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${body.placeId}`,
      hasVoiceOfMerchant: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    mockState.manualLocations.push(location);
    return HttpResponse.json(location, { status: 201 });
  }),

  /** Sucursales ya en Opinara (las nuestras, no las de Google): importadas y manuales. */
  http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () =>
    HttpResponse.json([
      ...[...mockState.importedLocationNames].map((name) => {
        const urn =
          name === mockImportedLocation.googleName
            ? mockImportedLocation.urn
            : `urn:location:${name.replace('locations/', '')}`;
        const google = mockGoogleLocations.find((location) => location.name === name);

        return {
          urn,
          source: 'GOOGLE',
          title: google?.title ?? mockImportedLocation.title,
          ...(google?.address === undefined ? {} : { address: google.address }),
          hasVoiceOfMerchant: true,
          isActive: !mockState.inactiveLocations.has(urn),
          createdAt: '2026-06-16T02:26:10.637Z',
          ...(mockState.locationsWithoutReviewUrl.has(urn)
            ? {}
            : { googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ficticio' }),
        };
      }),
      ...mockState.manualLocations,
    ]),
  ),
];
