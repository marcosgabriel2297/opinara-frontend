import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiErrorBody, mockSession } from '@/mocks/fixtures';
import { server } from '@/mocks/server';

import { ApiError, ClientErrorCodes } from './api-error';
import { API_BASE_URL, api, request, resetRefreshState } from './client';
import { session } from './session';

const protectedSchema = z.object({ ok: z.literal(true) });

/** Endpoint protegido: 401 mientras el Authorization no traiga el access token vigente. */
function protectedHandler(onCall?: () => void) {
  return http.get(`${API_BASE_URL}/protegido`, ({ request: req }) => {
    onCall?.();

    if (req.headers.get('Authorization') !== `Bearer ${mockSession.accessToken}`) {
      return HttpResponse.json(apiErrorBody(401, 'UNAUTHORIZED', '/api/protegido'), { status: 401 });
    }

    return HttpResponse.json({ ok: true });
  });
}

beforeEach(() => {
  session.clear();
  resetRefreshState();
});

describe('request', () => {
  it('adjunta el access token cuando hay sesión', async () => {
    session.set({ accessToken: mockSession.accessToken, refreshToken: mockSession.refreshToken });
    server.use(protectedHandler());

    await expect(api.get('/protegido', { schema: protectedSchema })).resolves.toEqual({ ok: true });
  });

  it('no manda Authorization en los endpoints públicos', async () => {
    session.set({ accessToken: mockSession.accessToken, refreshToken: mockSession.refreshToken });

    let authorization: string | null = 'sin leer';
    server.use(
      http.get(`${API_BASE_URL}/publico`, ({ request: req }) => {
        authorization = req.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await request('/publico', { auth: false, schema: protectedSchema });

    expect(authorization).toBeNull();
  });

  it('normaliza el error del backend a ApiError con su errorCode', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () =>
        HttpResponse.json(apiErrorBody(401, 'WRONG_CREDENTIALS', '/api/auth/login'), { status: 401 }),
      ),
    );

    const error = await api
      .post('/auth/login', { auth: false, body: {}, schema: protectedSchema })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).errorCode).toBe('WRONG_CREDENTIALS');
    expect((error as ApiError).statusCode).toBe(401);
  });

  it('sintetiza un errorCode cuando el cuerpo del error no tiene la forma esperada', async () => {
    server.use(http.get(`${API_BASE_URL}/roto`, () => new HttpResponse('<html>502</html>', { status: 502 })));

    const error = await request('/roto', { auth: false, schema: protectedSchema }).catch((caught: unknown) => caught);

    expect((error as ApiError).errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect((error as ApiError).statusCode).toBe(502);
  });

  it('falla fuerte si la respuesta no valida contra el schema', async () => {
    server.use(http.get(`${API_BASE_URL}/raro`, () => HttpResponse.json({ ok: 'sí' })));

    const error = await request('/raro', { auth: false, schema: protectedSchema }).catch((caught: unknown) => caught);

    expect((error as ApiError).errorCode).toBe(ClientErrorCodes.INVALID_RESPONSE);
  });

  it('devuelve undefined en un 204 sin cuerpo', async () => {
    session.set({ accessToken: mockSession.accessToken, refreshToken: mockSession.refreshToken });
    server.use(http.delete(`${API_BASE_URL}/algo`, () => new HttpResponse(null, { status: 204 })));

    await expect(api.delete('/algo')).resolves.toBeUndefined();
  });

  it('convierte una caída de red en ApiError, no en TypeError', async () => {
    server.use(http.get(`${API_BASE_URL}/sin-red`, () => HttpResponse.error()));

    const error = await request('/sin-red', { auth: false, schema: protectedSchema }).catch(
      (caught: unknown) => caught,
    );

    expect((error as ApiError).errorCode).toBe(ClientErrorCodes.NETWORK_ERROR);
  });

  it('omite del query string los parámetros vacíos', async () => {
    let url = '';
    server.use(
      http.get(`${API_BASE_URL}/listado`, ({ request: req }) => {
        url = req.url;
        return HttpResponse.json({ ok: true });
      }),
    );

    await request('/listado', {
      auth: false,
      query: { page: 0, rating: undefined, hasReply: '' },
      schema: protectedSchema,
    });

    expect(url).toContain('page=0');
    expect(url).not.toContain('rating');
    expect(url).not.toContain('hasReply');
  });
});

describe('cuerpo binario', () => {
  it('un Blob viaja crudo, con su propio Content-Type', async () => {
    let received: { type: string | null; text: string } | null = null;
    server.use(
      http.put(`${API_BASE_URL}/imagen`, async ({ request: req }) => {
        received = { type: req.headers.get('Content-Type'), text: await req.text() };
        return HttpResponse.json({ ok: true });
      }),
    );

    await api.put('/imagen', {
      auth: false,
      body: new Blob(['bytes'], { type: 'image/webp' }),
      schema: protectedSchema,
    });
    expect(received).toEqual({ type: 'image/webp', text: 'bytes' });
  });
});

describe('base relativa', () => {
  it('con VITE_API_BASE_URL="/api" (proxy del dev server) pide al origen de la página', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api');
    vi.resetModules();
    const relative = await import('./client');

    let url = '';
    server.use(
      http.get(`${window.location.origin}/api/publico`, ({ request: req }) => {
        url = req.url;
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      relative.api.get('/publico', { auth: false, query: { page: 2 }, schema: protectedSchema }),
    ).resolves.toEqual({ ok: true });
    expect(url).toBe(`${window.location.origin}/api/publico?page=2`);
    vi.unstubAllEnvs();
  });
});

describe('refresh ante 401', () => {
  it('refresca una vez y reintenta el request original', async () => {
    session.set({ accessToken: 'vencido', refreshToken: mockSession.refreshToken });

    let refreshes = 0;
    server.use(
      protectedHandler(),
      http.post(`${API_BASE_URL}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json(mockSession);
      }),
    );

    await expect(api.get('/protegido', { schema: protectedSchema })).resolves.toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(session.getAccessToken()).toBe(mockSession.accessToken);
  });

  it('con diez requests en vuelo dispara un solo refresh (single-flight)', async () => {
    session.set({ accessToken: 'vencido', refreshToken: mockSession.refreshToken });

    let refreshes = 0;
    server.use(
      protectedHandler(),
      http.post(`${API_BASE_URL}/auth/refresh`, async () => {
        refreshes += 1;
        // Ventana real para que las otras nueve lleguen al 401 antes de que este resuelva.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return HttpResponse.json(mockSession);
      }),
    );

    const results = await Promise.all(
      Array.from({ length: 10 }, () => api.get('/protegido', { schema: protectedSchema })),
    );

    expect(results).toEqual(Array.from({ length: 10 }, () => ({ ok: true })));
    expect(refreshes).toBe(1);
  });

  it('no reintenta más de una vez: si sigue dando 401 después de refrescar, falla', async () => {
    session.set({ accessToken: 'vencido', refreshToken: mockSession.refreshToken });

    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/protegido`, () => {
        calls += 1;
        return HttpResponse.json(apiErrorBody(401, 'UNAUTHORIZED', '/api/protegido'), { status: 401 });
      }),
      http.post(`${API_BASE_URL}/auth/refresh`, () => HttpResponse.json(mockSession)),
    );

    const error = await api.get('/protegido', { schema: protectedSchema }).catch((caught: unknown) => caught);

    expect(calls).toBe(2);
    expect((error as ApiError).statusCode).toBe(401);
  });

  it('si el refresh falla, limpia la sesión y avisa', async () => {
    session.set({ accessToken: 'vencido', refreshToken: 'refresh-vencido' });

    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    server.use(
      protectedHandler(),
      http.post(`${API_BASE_URL}/auth/refresh`, () =>
        HttpResponse.json(apiErrorBody(401, 'INVALID_REFRESH_TOKEN', '/api/auth/refresh'), { status: 401 }),
      ),
    );

    const error = await api.get('/protegido', { schema: protectedSchema }).catch((caught: unknown) => caught);

    expect((error as ApiError).errorCode).toBe(ClientErrorCodes.SESSION_EXPIRED);
    expect(session.getRefreshToken()).toBeNull();
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('sin refresh token no intenta refrescar', async () => {
    let refreshes = 0;
    server.use(
      protectedHandler(),
      http.post(`${API_BASE_URL}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json(mockSession);
      }),
    );

    const error = await api.get('/protegido', { schema: protectedSchema }).catch((caught: unknown) => caught);

    expect(refreshes).toBe(0);
    expect((error as ApiError).errorCode).toBe(ClientErrorCodes.SESSION_EXPIRED);
  });

  it('no refresca ante un 401 de un endpoint público (login con credenciales malas)', async () => {
    session.set({ accessToken: 'vencido', refreshToken: mockSession.refreshToken });

    let refreshes = 0;
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () =>
        HttpResponse.json(apiErrorBody(401, 'WRONG_CREDENTIALS', '/api/auth/login'), { status: 401 }),
      ),
      http.post(`${API_BASE_URL}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json(mockSession);
      }),
    );

    await api
      .post('/auth/login', { auth: false, body: {}, schema: protectedSchema })
      .catch((caught: unknown) => caught);

    expect(refreshes).toBe(0);
    expect(session.getRefreshToken()).toBe(mockSession.refreshToken);
  });
});
