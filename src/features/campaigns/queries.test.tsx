import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL, session } from '@/lib/http';
import { createQueryClient } from '@/lib/query-client';
import { apiErrorBody, mockBusiness } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { signIn } from '@/test/render';

import { useCampaignQr } from './queries';

beforeEach(() => {
  session.clear();
  signIn();
});

describe('useCampaignQr con la política real de la app', () => {
  // `renderApp` usa un QueryClient de test sin reintentos: este test usa el de la app
  // (`createQueryClient`, que sí reintenta los 5xx) para comprobar que el QR no lo hace.
  it('un 5xx deja la query en error con un solo POST, sin reintentos automáticos', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/businesses/:b/campaigns/:c/qr`, () => {
        calls += 1;
        return HttpResponse.json(apiErrorBody(500, 'INTERNAL_SERVER_ERROR'), { status: 500 });
      }),
    );
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCampaignQr(mockBusiness.urn, 'urn:campaign:mostrador', true), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(calls).toBe(1);
  });
});
