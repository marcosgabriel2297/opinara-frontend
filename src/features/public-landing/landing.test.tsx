import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { browser } from '@/lib/browser';
import { API_BASE_URL, session } from '@/lib/http';
import { renderApp } from '@/test/render';

const QR = '/r/cafe-de-la-esquina/mostrador';
const SCAN_URL = `${API_BASE_URL}/public/r/cafe-de-la-esquina/mostrador`;

// Lo abre un cliente que escaneó el QR: ningún test inicia sesión a propósito.
beforeEach(() => {
  session.clear();
});

describe('QR', () => {
  it('salta directo al backend, que cuenta el escaneo y redirige a Google', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp([QR]);

    expect(await screen.findByText('Te llevamos a Google…')).toBeInTheDocument();
    // La navegación sale de un efecto, que corre después de pintar el texto: hay que esperarla. Si no
    // llega, o va a otra URL, el test igual falla (al vencer la espera).
    await waitFor(() => {
      expect(replaceWith).toHaveBeenCalledWith(SCAN_URL);
    });
  });

  it('navega una sola vez aunque StrictMode monte dos veces: cada navegación es un escaneo', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp([QR]);

    await screen.findByText('Te llevamos a Google…');
    // Las dos pasadas del efecto de StrictMode corren juntas: si hubiera una segunda navegación,
    // ya estaría al llegar la primera, y la espera vencería con 2 llamadas.
    await waitFor(() => {
      expect(replaceWith).toHaveBeenCalledTimes(1);
    });
  });

  it('no muestra formulario propio: la reseña se deja en Google', async () => {
    vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp([QR]);

    await screen.findByText('Te llevamos a Google…');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('escapa los slugs al armar la URL', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp(['/r/un%20negocio/mostrador']);

    await screen.findByText('Te llevamos a Google…');
    await waitFor(() => {
      expect(replaceWith).toHaveBeenCalledWith(`${API_BASE_URL}/public/r/un%20negocio/mostrador`);
    });
  });

  describe('si la navegación no arranca', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('ofrece el link a mano después de unos segundos', async () => {
      vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
      renderApp([QR]);

      await screen.findByText('Te llevamos a Google…');
      expect(screen.queryByRole('link', { name: 'Si no se abre solo, tocá acá' })).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(screen.getByRole('link', { name: 'Si no se abre solo, tocá acá' })).toHaveAttribute('href', SCAN_URL);
    });
  });
});

describe('QR que no sirve', () => {
  it('muestra un único mensaje y no intenta redirigir', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp(['/r/no-disponible']);

    expect(await screen.findByRole('heading', { name: 'Este código ya no está disponible' })).toBeInTheDocument();
    // Una ausencia solo prueba algo si los efectos de la pantalla ya corrieron: el `meta` de
    // noindex sale de un efecto, así que esperarlo garantiza que no queda ninguno pendiente.
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).not.toBeNull();
    });
    expect(replaceWith).not.toHaveBeenCalled();
  });

  it('pide que no se indexe', async () => {
    renderApp(['/r/no-disponible']);

    await screen.findByRole('heading', { name: 'Este código ya no está disponible' });
    // El `meta` sale de un efecto, que puede correr después de que aparece el título.
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    });
  });
});

describe('QR con muchos escaneos seguidos', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('explica que hay mucha gente y reintenta solo al rato, sin mostrar un error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    renderApp([`${QR}/espera`]);

    expect(await screen.findByRole('heading', { name: 'Hay mucha gente escaneando este código' })).toBeInTheDocument();
    expect(replaceWith).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(replaceWith).toHaveBeenCalledWith(SCAN_URL);
  });

  it('"Probar ahora" no hace esperar', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    const { user } = renderApp([`${QR}/espera`]);

    await user.click(await screen.findByRole('button', { name: 'Probar ahora' }));
    expect(replaceWith).toHaveBeenCalledWith(SCAN_URL);
  });
});
