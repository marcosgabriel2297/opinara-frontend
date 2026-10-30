import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockBusiness } from '../fixtures';
import { mockState } from '../state';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function replaceBusiness(businessUrn: string, changes: Partial<typeof mockBusiness>) {
  const current = mockState.businesses.find((business) => business.urn === businessUrn);
  if (current === undefined) return null;
  const updated = { ...current, ...changes };
  mockState.businesses = mockState.businesses.map((business) => (business.urn === businessUrn ? updated : business));
  return updated;
}

export const businessHandlers = [
  http.put(`${API_BASE_URL}/businesses/:businessUrn/logo`, async ({ request, params }) => {
    const businessUrn = String(params.businessUrn);
    const path = `/api/businesses/${businessUrn}/logo`;
    const type = request.headers.get('Content-Type') ?? '';
    const image = await request.blob();
    // Mismo contrato que el backend: solo PNG, JPEG o WebP (el SVG lo convierte el navegador).
    if (!LOGO_TYPES.has(type) || image.size === 0) {
      return HttpResponse.json(apiErrorBody(400, 'LOGO_INVALID_IMAGE', path), { status: 400 });
    }

    const business = mockState.businesses.find((candidate) => candidate.urn === businessUrn);
    if (business === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'BUSINESS_NOT_FOUND', path), { status: 404 });
    }
    mockState.logos.set(business.slug, new Blob([image], { type }));
    return HttpResponse.json(replaceBusiness(businessUrn, { logoUpdatedAt: new Date().toISOString() }));
  }),

  http.delete(`${API_BASE_URL}/businesses/:businessUrn/logo`, ({ params }) => {
    const businessUrn = String(params.businessUrn);
    const business = mockState.businesses.find((candidate) => candidate.urn === businessUrn);
    if (business !== undefined) mockState.logos.delete(business.slug);
    return HttpResponse.json(replaceBusiness(businessUrn, { logoUpdatedAt: null }));
  }),

  http.get(`${API_BASE_URL}/public/businesses/:businessSlug/logo`, ({ params }) => {
    const logo = mockState.logos.get(String(params.businessSlug));
    if (logo === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'LOGO_NOT_FOUND', '/api/public/businesses/logo'), { status: 404 });
    }
    return new HttpResponse(logo, { headers: { 'Content-Type': logo.type } });
  }),

  http.get(`${API_BASE_URL}/businesses`, () => HttpResponse.json(mockState.businesses)),

  http.post(`${API_BASE_URL}/businesses`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; slug?: string; timezone?: string };
    const slug = body.slug ?? slugify(body.name ?? '');

    // Mismo comportamiento que el backend: un nombre sin letras ni números no da slug.
    if (slug === '') {
      return HttpResponse.json(apiErrorBody(400, 'SLUG_NOT_DERIVABLE', '/api/businesses'), { status: 400 });
    }

    if (mockState.businesses.some((business) => business.slug === slug)) {
      return HttpResponse.json(apiErrorBody(409, 'BUSINESS_SLUG_ALREADY_EXISTS', '/api/businesses'), { status: 409 });
    }

    const created = {
      ...mockBusiness,
      urn: `urn:business:${slug}`,
      name: body.name ?? mockBusiness.name,
      slug,
      timezone: body.timezone ?? mockBusiness.timezone,
      role: 'OWNER',
    } as typeof mockBusiness;

    mockState.businesses = [...mockState.businesses, created];

    return HttpResponse.json(created);
  }),
];
