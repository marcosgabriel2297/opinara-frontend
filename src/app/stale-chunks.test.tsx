import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { browser } from '@/lib/browser';
import { resetStaleChunksForTests, watchStaleChunks } from '@/lib/stale-chunks';

import { RouteErrorBoundary } from './route-error-boundary';

/** Una ruta cuyo chunk ya no existe: así lo ve la app cuando un deploy borró la versión anterior. */
function renderStaleRoute() {
  const router = createMemoryRouter(
    [
      {
        path: '/privacy',
        errorElement: <RouteErrorBoundary />,
        lazy: () => {
          window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
          return Promise.reject(new TypeError('Failed to fetch dynamically imported module'));
        },
      },
    ],
    { initialEntries: ['/privacy'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeAll(() => {
  watchStaleChunks();
});

afterEach(() => {
  sessionStorage.clear();
  resetStaleChunksForTests();
  vi.useRealTimers();
});

describe('chunks de una versión anterior', () => {
  it('recarga la página parado en la ruta de destino', async () => {
    const reload = vi.spyOn(browser, 'reload').mockImplementation(() => undefined);

    const router = renderStaleRoute();

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/privacy');
  });

  it('si recargar no alcanzó, muestra el error en vez de recargar en bucle', async () => {
    const reload = vi.spyOn(browser, 'reload').mockImplementation(() => undefined);
    sessionStorage.setItem('opinara.stale-chunks-reloaded-at', String(Date.now() - 2_000));

    renderStaleRoute();

    expect(await screen.findByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('un error cualquiera de la ruta no recarga', async () => {
    const reload = vi.spyOn(browser, 'reload').mockImplementation(() => undefined);
    const router = createMemoryRouter(
      [
        {
          path: '/',
          errorElement: <RouteErrorBoundary />,
          loader: () => {
            throw new Error('boom');
          },
          Component: () => null,
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
