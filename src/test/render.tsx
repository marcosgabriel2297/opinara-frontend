import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router';

import { Providers } from '@/app/providers';
import { session } from '@/lib/http';
import { mockSession } from '@/mocks/fixtures';
import { routes } from '@/app/router';
import { AuthProvider } from '@/features/auth/auth-provider';

/** Deja una sesión válida antes de montar, para los tests que arrancan ya adentro. */
export function signIn(): void {
  session.set({ accessToken: mockSession.accessToken, refreshToken: mockSession.refreshToken });
}

/** Monta la app real (rutas, guards, providers) sobre un router en memoria. */
export function renderApp(initialEntries: InitialEntry[] = ['/']) {
  const router = createMemoryRouter(routes, { initialEntries });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // Con StrictMode, igual que en la app: así los tests ven los efectos ejecutados dos veces.
  const utils = render(
    <StrictMode>
      <Providers client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </Providers>
    </StrictMode>,
  );

  return { ...utils, router, user: userEvent.setup() };
}
