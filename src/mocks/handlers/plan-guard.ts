import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody } from '../fixtures';
import { mockState } from '../state';

/**
 * Como el guard del backend: reseñas, campañas y su sincronización solo con `REVIEWS` en el plan.
 * Va antes que los demás handlers; si el plan la incluye no responde nada y el pedido sigue de largo.
 * Así un test se entera si alguna pantalla le pide reseñas a un negocio de solo fidelización.
 */
const reviewsOnly = [
  '/businesses/:businessUrn/reviews*',
  '/businesses/:businessUrn/campaigns*',
  '/businesses/:businessUrn/scans',
  '/businesses/:businessUrn/locations/:locationUrn/reviews*',
  '/businesses/:businessUrn/google/sync',
];

export const planGuardHandlers = reviewsOnly.map((path) =>
  http.all(`${API_BASE_URL}${path}`, ({ params }) => {
    const business = mockState.businesses.find(
      (candidate) => candidate.urn === decodeURIComponent(String(params.businessUrn)),
    );
    if (business === undefined || business.features.includes('REVIEWS')) return undefined;
    return HttpResponse.json(apiErrorBody(403, 'PLAN_FEATURE_NOT_INCLUDED'), { status: 403 });
  }),
);
