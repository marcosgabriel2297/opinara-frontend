import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockImportedLocation, mockSuggestion } from '../fixtures';
import { mockState } from '../state';

const reviewsBase = `${API_BASE_URL}/businesses/:businessUrn/locations/:locationUrn/reviews`;

const DAY_MS = 24 * 60 * 60 * 1000;

function average(ratings: number[]): number | null {
  const rated = ratings.filter((rating) => rating > 0);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((sum, rating) => sum + rating, 0) / rated.length) * 100) / 100;
}

function find(reviewUrn: string) {
  return mockState.reviews.find((review) => review.urn === decodeURIComponent(reviewUrn));
}

export const reviewHandlers = [
  // Todas las sucursales del negocio (el mock tiene una).
  http.get(`${API_BASE_URL}/businesses/:businessUrn/reviews`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? '0');
    const limit = Number(params.get('limit') ?? '20');
    const hasReply = params.get('hasReply');
    const oldest = params.get('order') === 'oldest';

    const filtered = mockState.reviews
      .filter((review) => {
        if (hasReply === 'true' && review.reply === undefined) return false;
        if (hasReply === 'false' && review.reply !== undefined) return false;
        return true;
      })
      .sort((a, b) => (oldest ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));

    return HttpResponse.json({
      items: filtered.slice(page * limit, (page + 1) * limit),
      page,
      limit,
      total: filtered.length,
    });
  }),

  http.get(`${API_BASE_URL}/businesses/:businessUrn/reviews/summary`, () => {
    const now = Date.now();
    const reviews = mockState.reviews;
    const unanswered = reviews.filter((review) => review.reply === undefined);
    const inWindow = (from: number, to: number) =>
      reviews.filter((review) => {
        const created = Date.parse(review.createdAt);
        return created >= now - from * DAY_MS && created < now - to * DAY_MS;
      });
    const last30 = inWindow(30, 0);
    const previous30 = inWindow(60, 30);
    const count = (stars: number) => reviews.filter((review) => review.rating === stars).length;

    return HttpResponse.json({
      total: reviews.length,
      unanswered: unanswered.length,
      oldestUnansweredAt: unanswered.map((review) => review.createdAt).sort()[0] ?? null,
      averageRating: average(reviews.map((review) => review.rating)),
      ratingCounts: { '1': count(1), '2': count(2), '3': count(3), '4': count(4), '5': count(5) },
      last30Days: { count: last30.length, averageRating: average(last30.map((review) => review.rating)) },
      previous30Days: { count: previous30.length, averageRating: average(previous30.map((review) => review.rating)) },
      replySuggestions: mockState.replySuggestions !== 'unavailable',
    });
  }),

  http.post(`${reviewsBase}/:reviewUrn/reply-suggestion`, ({ params }) => {
    if (mockState.replySuggestions === 'unavailable') {
      return HttpResponse.json(apiErrorBody(503, 'REPLY_SUGGESTIONS_UNAVAILABLE'), { status: 503 });
    }
    if (mockState.replySuggestions === 'failed') {
      return HttpResponse.json(apiErrorBody(503, 'REPLY_SUGGESTION_FAILED'), { status: 503 });
    }
    const review = find(String(params.reviewUrn));
    if (review === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'REVIEW_NOT_FOUND'), { status: 404 });
    }

    const firstName = review.reviewer.isAnonymous ? undefined : review.reviewer.displayName?.split(' ')[0];
    return HttpResponse.json({ comment: mockSuggestion(review.rating, firstName) });
  }),

  http.get(reviewsBase, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? '0');
    const limit = Number(params.get('limit') ?? '20');
    const rating = params.get('rating');
    const hasReply = params.get('hasReply');

    const filtered = mockState.reviews.filter((review) => {
      if (rating !== null && review.rating !== Number(rating)) return false;
      if (hasReply === 'true' && review.reply === undefined) return false;
      if (hasReply === 'false' && review.reply !== undefined) return false;

      return true;
    });

    return HttpResponse.json({
      items: filtered.slice(page * limit, (page + 1) * limit),
      page,
      limit,
      total: filtered.length,
    });
  }),

  http.get(`${reviewsBase}/:reviewUrn`, ({ params }) => {
    const review = find(String(params.reviewUrn));
    if (review === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'REVIEW_NOT_FOUND'), { status: 404 });
    }

    return HttpResponse.json(review);
  }),

  http.put(`${reviewsBase}/:reviewUrn/reply`, async ({ params, request }) => {
    const review = find(String(params.reviewUrn));
    if (review === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'REVIEW_NOT_FOUND'), { status: 404 });
    }

    const body = (await request.json()) as { comment?: string };
    const comment = (body.comment ?? '').trim();
    if (comment === '') {
      return HttpResponse.json(apiErrorBody(400, 'BAD_REQUEST'), { status: 400 });
    }

    // `PUT` crea o pisa, indistintamente: igual que `updateReply` de Google.
    review.reply = { comment, updatedAt: new Date().toISOString() };

    return HttpResponse.json(review);
  }),

  http.delete(`${reviewsBase}/:reviewUrn/reply`, ({ params }) => {
    const review = find(String(params.reviewUrn));
    if (review?.reply === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'REVIEW_REPLY_NOT_FOUND'), { status: 404 });
    }

    delete review.reply;

    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * Sincronización del negocio. Devuelve **200 incluso con `failed > 0`**: es el caso que la UI
   * tiene que saber mostrar, así que el mock lo puede provocar a pedido.
   */
  http.post(`${API_BASE_URL}/businesses/:businessUrn/google/sync`, () => {
    const result = (locationUrn: string, truncated = false) => ({
      locationUrn,
      imported: 3,
      updated: 1,
      unchanged: 5,
      deleted: 0,
      pages: 2,
      full: false,
      truncated,
      startedAt: '2026-09-14T03:00:00.000Z',
      finishedAt: '2026-09-14T03:00:12.000Z',
    });

    switch (mockState.syncOutcome) {
      case 'partial':
        return HttpResponse.json({
          locations: 2,
          succeeded: 1,
          failed: 1,
          results: [result(mockImportedLocation.urn)],
          failures: [{ locationUrn: 'urn:location:222', errorCode: 'GOOGLE_RATE_LIMITED' }],
        });

      case 'allFailed':
        return HttpResponse.json({
          locations: 2,
          succeeded: 0,
          failed: 2,
          results: [],
          failures: [
            { locationUrn: mockImportedLocation.urn, errorCode: 'GOOGLE_PERMISSION_DENIED' },
            { locationUrn: 'urn:location:222', errorCode: 'GOOGLE_UNAVAILABLE' },
          ],
        });

      case 'truncated':
        return HttpResponse.json({
          locations: 1,
          succeeded: 1,
          failed: 0,
          results: [result(mockImportedLocation.urn, true)],
          failures: [],
        });

      default:
        return HttpResponse.json({
          locations: 1,
          succeeded: 1,
          failed: 0,
          results: [result(mockImportedLocation.urn)],
          failures: [],
        });
    }
  }),
];
