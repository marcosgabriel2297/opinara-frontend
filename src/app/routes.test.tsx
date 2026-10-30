import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { browser } from '@/lib/browser';
import { API_BASE_URL, session } from '@/lib/http';
import { mockBusiness, mockImportedLocation } from '@/mocks/fixtures';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

import { routePatterns } from './paths';

const location = encodeURIComponent(mockImportedLocation.urn);
const review = encodeURIComponent('urn:review:bbbb2222');
const campaign = encodeURIComponent('urn:campaign:mostrador');

beforeEach(() => {
  session.clear();
  localStorage.removeItem('opinara.business');
  sessionStorage.clear();
});

describe('URLs viejas (en español)', () => {
  beforeEach(() => {
    signIn();
  });

  it.each([
    ['/resenas', '/reviews'],
    [`/resenas/${location}/${review}`, `/reviews/${location}/${review}`],
    ['/campanas', '/campaigns'],
    [`/campanas/${campaign}`, `/campaigns/${campaign}`],
    ['/configuracion', '/settings'],
    ['/configuracion/google', '/settings/google'],
    ['/configuracion/google/conectado', '/settings/google/callback'],
    ['/configuracion/google/cuentas', '/settings/google/accounts'],
    ['/configuracion/google/sucursales', '/settings/google/locations'],
  ])('%s lleva a %s sin dejar la vieja en el historial', async (from, to) => {
    const { router } = renderApp([from]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(to);
    });
    // `replace`: el "atrás" no vuelve a la URL vieja (que redirigiría otra vez).
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it.each([
    ['/ingresar', '/login'],
    // Ya no hay registro: los links viejos caen en el login.
    ['/crear-cuenta', '/login'],
    ['/sign-up', '/login'],
  ])('%s lleva a %s', async (from, to) => {
    session.clear();
    const { router } = renderApp([from]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(to);
    });
  });

  it('traduce los filtros de reseñas y los aplica', async () => {
    const { router } = renderApp([`/resenas?sucursal=${location}&estrellas=2&respondidas=si&pagina=1`]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('location')).toBe(mockImportedLocation.urn);
    expect(params.get('rating')).toBe('2');
    expect(params.get('replied')).toBe('yes');
    expect(params.get('page')).toBe('1');
    // Y la pantalla los toma: no es solo un cambio de nombre en la URL.
    expect(await screen.findByLabelText('Calificación')).toHaveValue('2');
    expect(screen.getByLabelText('Respuesta')).toHaveValue('yes');
  });

  it('"respondidas=no" pasa a "replied=no"', async () => {
    const { router } = renderApp(['/resenas?respondidas=no']);

    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('replied')).toBe('no');
    });
  });

  it('descarta lo que no reconoce en vez de arrastrar un filtro inválido', async () => {
    const { router } = renderApp(['/resenas?respondidas=quizas&utm_source=whatsapp']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
    const params = new URLSearchParams(router.state.location.search);
    expect(params.has('replied')).toBe(false);
    expect(params.has('utm_source')).toBe(false);
  });

  it('traduce la cuenta de Google de la importación de sucursales', async () => {
    const { router } = renderApp(['/configuracion/google/sucursales?cuenta=accounts%2F1234567890']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/settings/google/locations');
    });
    expect(new URLSearchParams(router.state.location.search).get('account')).toBe('accounts/1234567890');
    expect(await screen.findByText('Sin link de reseñas en Google')).toBeInTheDocument();
  });
});

describe('vuelta de Google por la URL vieja (la que tiene configurada el backend)', () => {
  beforeEach(() => {
    signIn();
  });

  it('conserva el error que agrega el backend', async () => {
    const { router } = renderApp(['/configuracion/google/conectado?error=GOOGLE_PERMISSION_DENIED']);

    expect(await screen.findByRole('alert')).toHaveTextContent('Google no completó el permiso.');
    expect(router.state.location.pathname).toBe('/settings/google/callback');
    expect(router.state.location.search).toBe('?error=GOOGLE_PERMISSION_DENIED');
  });

  it('conserva el negocio que estaba conectando', async () => {
    const otro = { ...mockBusiness, urn: 'urn:business:otro', name: 'Peluquería', slug: 'peluqueria' };
    givenMock.businesses([mockBusiness, otro]);
    sessionStorage.setItem('opinara.google-connecting', otro.urn);

    renderApp(['/configuracion/google/conectado']);

    await waitFor(() => {
      expect(localStorage.getItem('opinara.business')).toBe(otro.urn);
    });
  });
});

describe('URL vieja sin sesión', () => {
  it('pide entrar y después vuelve a la URL nueva, con sus filtros', async () => {
    const { user, router } = renderApp(['/resenas?estrellas=3']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    // La URL cambia antes de que React pinte el login: el formulario hay que esperarlo.
    await user.type(await screen.findByLabelText('Email'), 'dueno@opinara.test');
    await user.type(screen.getByLabelText('Contraseña'), 'claveSuperSegura1');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
    expect(router.state.location.search).toBe('?rating=3');
  });
});

describe('rutas públicas del QR (impresas: no cambian)', () => {
  it('el patrón del QR sigue siendo /r/:businessSlug/:campaignSlug', () => {
    // Es lo que codifican los QR impresos y lo que arma el backend. Si este test falla, se
    // rompen todos los QR del mundo real: no se "arregla" cambiando el valor esperado.
    expect(routePatterns.publicCampaign).toBe('/r/:businessSlug/:campaignSlug');
  });

  it('/r/:negocio/:campaña sigue llevando al escaneo del backend', async () => {
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    const { router } = renderApp(['/r/cafe-de-la-esquina/mostrador']);

    expect(await screen.findByText('Te llevamos a Google…')).toBeInTheDocument();
    expect(replaceWith).toHaveBeenCalledWith(`${API_BASE_URL}/public/r/cafe-de-la-esquina/mostrador`);
    expect(router.state.location.pathname).toBe('/r/cafe-de-la-esquina/mostrador');
  });

  it.each(['/r/no-disponible', '/r/unavailable'])(
    '%s muestra la página de no disponible sin redirigir',
    async (url) => {
      const { router } = renderApp([url]);

      expect(await screen.findByRole('heading', { name: 'Este código ya no está disponible' })).toBeInTheDocument();
      // Alias, no redirect: la URL que mandó el backend queda tal cual.
      expect(router.state.location.pathname).toBe(url);
    },
  );
});
