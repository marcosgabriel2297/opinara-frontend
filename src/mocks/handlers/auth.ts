import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockSession, mockUser } from '../fixtures';
import { mockState } from '../state';

const SEEDED_PASSWORD = 'claveSuperSegura1';
/** La que da el administrador al crear la cuenta: entrar con ella lleva a cambiarla. */
export const TEMPORARY_PASSWORD = 'provisoria-de-prueba';

export const authHandlers = [
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.password !== SEEDED_PASSWORD && body.password !== TEMPORARY_PASSWORD) {
      return HttpResponse.json(apiErrorBody(401, 'WRONG_CREDENTIALS', '/api/auth/login'), { status: 401 });
    }

    return HttpResponse.json({
      ...mockSession,
      user: {
        ...mockUser,
        email: body.email ?? mockUser.email,
        mustChangePassword: body.password === TEMPORARY_PASSWORD,
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/password/change`, async ({ request }) => {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const path = '/api/auth/password/change';

    if (body.currentPassword !== TEMPORARY_PASSWORD && body.currentPassword !== SEEDED_PASSWORD) {
      return HttpResponse.json(apiErrorBody(400, 'WRONG_CURRENT_PASSWORD', path), { status: 400 });
    }
    if (body.newPassword === body.currentPassword) {
      return HttpResponse.json(apiErrorBody(400, 'SAME_PASSWORD', path), { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };

    if (body.refreshToken !== mockSession.refreshToken) {
      return HttpResponse.json(apiErrorBody(401, 'INVALID_REFRESH_TOKEN', '/api/auth/refresh'), { status: 401 });
    }

    return HttpResponse.json(mockSession);
  }),

  http.post(`${API_BASE_URL}/auth/logout`, async ({ request }) => {
    const { refreshToken = '' } = (await request.json()) as { refreshToken?: string };
    mockState.loggedOut.push(refreshToken);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/auth/logout/all`, () => {
    mockState.loggedOutEverywhere += 1;
    return new HttpResponse(null, { status: 204 });
  }),

  // Como el backend: 202 exista o no la cuenta.
  http.post(`${API_BASE_URL}/auth/password/forgot`, () => new HttpResponse(null, { status: 202 })),

  http.post(`${API_BASE_URL}/auth/password/reset`, async ({ request }) => {
    const { token = '' } = (await request.json()) as { token?: string };
    if (!mockState.resetTokens.delete(token)) {
      return HttpResponse.json(apiErrorBody(400, 'INVALID_RESET_TOKEN', '/api/auth/password/reset'), { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE_URL}/auth/me`, ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${mockSession.accessToken}`) {
      return HttpResponse.json(apiErrorBody(401, 'UNAUTHORIZED', '/api/auth/me'), { status: 401 });
    }

    return HttpResponse.json(mockUser);
  }),
];
