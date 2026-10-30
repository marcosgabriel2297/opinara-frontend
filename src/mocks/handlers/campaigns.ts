import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockBusiness, mockCampaigns, mockQrPngDataUrl } from '../fixtures';
import { mockState } from '../state';

const base = `${API_BASE_URL}/businesses/:businessUrn/campaigns`;

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Los lunes de las últimas `count` semanas, en UTC: alcanza para el mock. */
function mondays(count: number): string[] {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  const monday =
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - ((today.getUTCDay() + 6) % 7) * day;
  return Array.from({ length: count }, (_, index) =>
    new Date(monday - (count - 1 - index) * 7 * day).toISOString().slice(0, 10),
  );
}

function scansResponse(request: Request) {
  const weeks = Number(new URL(request.url).searchParams.get('weeks') ?? '12');
  const series = mockState.scanWeeks.slice(-weeks);
  const padded = [...Array.from({ length: Math.max(0, weeks - series.length) }, () => 0), ...series];
  const firstWithScans = padded.findIndex((scans) => scans > 0);
  const weekStarts = mondays(weeks);

  return HttpResponse.json({
    weeks: weekStarts.map((week, index) => ({ week, scans: padded[index] ?? 0 })),
    trackedSince: firstWithScans === -1 ? null : `${weekStarts[firstWithScans] ?? ''}T12:00:00.000Z`,
  });
}

export const campaignHandlers = [
  http.get(`${API_BASE_URL}/businesses/:businessUrn/scans`, ({ request }) => scansResponse(request)),
  http.get(`${base}/:campaignUrn/scans`, ({ request }) => scansResponse(request)),

  http.get(base, () => HttpResponse.json(mockState.campaigns)),

  http.get(`${base}/:campaignUrn`, ({ params }) => {
    const campaign = mockState.campaigns.find((item) => item.urn === decodeURIComponent(String(params.campaignUrn)));
    if (campaign === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'CAMPAIGN_NOT_FOUND'), { status: 404 });
    }

    return HttpResponse.json(campaign);
  }),

  http.post(base, async ({ request }) => {
    const body = (await request.json()) as { name?: string; slug?: string; locationUrn?: string };
    const slug = body.slug ?? slugify(body.name ?? '');

    if (slug === '') {
      return HttpResponse.json(apiErrorBody(400, 'SLUG_NOT_DERIVABLE'), { status: 400 });
    }

    // Una sucursal sin link de reseñas en Google no se puede usar en una campaña.
    if (mockState.locationsWithoutReviewUrl.has(body.locationUrn ?? '')) {
      return HttpResponse.json(apiErrorBody(400, 'LOCATION_NOT_REVIEWABLE'), { status: 400 });
    }

    if (mockState.campaigns.some((campaign) => campaign.slug === slug)) {
      return HttpResponse.json(apiErrorBody(409, 'CAMPAIGN_SLUG_ALREADY_EXISTS'), { status: 409 });
    }

    const created = {
      ...mockCampaigns[0]!,
      urn: `urn:campaign:${slug}`,
      name: body.name ?? '',
      slug,
      locationUrn: body.locationUrn ?? '',
      stats: { scans: 0, googleClicks: 0 },
      targetUrl: `http://localhost:5173/r/${mockBusiness.slug}/${slug}`,
    };

    mockState.campaigns = [...mockState.campaigns, created];

    return HttpResponse.json(created);
  }),

  http.post(`${base}/:campaignUrn/qr`, ({ params }) => {
    const campaign = mockState.campaigns.find((item) => item.urn === decodeURIComponent(String(params.campaignUrn)));
    if (campaign === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'CAMPAIGN_NOT_FOUND'), { status: 404 });
    }

    return HttpResponse.json({ targetUrl: campaign.targetUrl, pngDataUrl: mockQrPngDataUrl });
  }),
];
