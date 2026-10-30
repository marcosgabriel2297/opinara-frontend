import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { browser } from '@/lib/browser';
import { API_BASE_URL, session } from '@/lib/http';
import { mockBusiness } from '@/mocks/fixtures';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

import type * as PrepareLogo from './prepare-logo';
import { LogoError, prepareLogo } from './prepare-logo';

// jsdom no dibuja en un canvas: lo que hace `prepareLogo` se prueba en el navegador. Acá alcanza
// con que devuelva la imagen lista.
vi.mock('./prepare-logo', async (importOriginal) => {
  const original = await importOriginal<typeof PrepareLogo>();
  return { ...original, prepareLogo: vi.fn() };
});

const LOGO_URL = `${API_BASE_URL}/public/businesses/${mockBusiness.slug}/logo`;
const file = (type = 'image/png') => new File(['bytes'], 'logo', { type });

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  vi.mocked(prepareLogo).mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
});

describe('logo en Configuración', () => {
  it('sin logo lo explica, y al subir uno se ve en la vista previa y arriba en la app', async () => {
    const { user } = renderApp(['/settings']);

    const card = (await screen.findByRole('heading', { name: 'Logo' })).closest<HTMLElement>('[data-slot="card"]')!;
    expect(within(card).getByText(/Sin logo, arriba se ve el de Opinara/)).toBeInTheDocument();

    await user.upload(within(card).getByLabelText('Subir logo'), file());

    expect(await screen.findByText('Listo: el logo nuevo ya se ve en todos lados.')).toBeInTheDocument();
    const preview = within(card).getByRole('img', { name: 'Logo actual de Café de la Esquina' });
    expect(preview.getAttribute('src')).toMatch(new RegExp(`^${LOGO_URL}\\?v=\\d+$`));
    expect(screen.getByRole('img', { name: 'Logo de Café de la Esquina' })).toHaveAttribute(
      'src',
      preview.getAttribute('src'),
    );
    expect(mockState.logos.get(mockBusiness.slug)?.type).toBe('image/webp');
    expect(within(card).getByRole('button', { name: 'Cambiar logo' })).toBeInTheDocument();
  });

  it('si la imagen no sirve lo dice y no sube nada', async () => {
    vi.mocked(prepareLogo).mockRejectedValueOnce(new LogoError('unsupported'));
    const { user } = renderApp(['/settings']);

    await user.upload(await screen.findByLabelText('Subir logo'), file('image/png'));

    expect(await screen.findByText(/Ese archivo no es una imagen que podamos usar/)).toBeInTheDocument();
    expect(mockState.logos.size).toBe(0);
  });

  it('si el backend la rechaza, muestra su mensaje', async () => {
    vi.mocked(prepareLogo).mockResolvedValueOnce(new Blob(['gif'], { type: 'image/gif' }));
    const { user } = renderApp(['/settings']);

    await user.upload(await screen.findByLabelText('Subir logo'), file());

    expect(await screen.findByText(/Esa imagen no se pudo usar/)).toBeInTheDocument();
  });

  describe('quitarlo', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      givenMock.logo();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('se deshace en vez de confirmarse, y se borra al cerrarse el aviso', async () => {
      const { user } = renderApp(['/settings']);

      await user.click(await screen.findByRole('button', { name: 'Quitar logo' }));
      expect(screen.getByText('Quitamos el logo.')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /Logo actual/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Deshacer' }));
      expect(screen.getByRole('img', { name: /Logo actual/ })).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(7000));
      expect(mockState.logos.size).toBe(1);

      await user.click(screen.getByRole('button', { name: 'Quitar logo' }));
      await act(() => vi.advanceTimersByTimeAsync(7000));

      await waitFor(() => {
        expect(mockState.logos.size).toBe(0);
      });
      expect(screen.getByRole('button', { name: 'Subir logo' })).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Logo de Café de la Esquina' })).not.toBeInTheDocument();
    });
  });

  it('un miembro lo ve pero no lo cambia', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp(['/settings']);

    expect(await screen.findByText('Lo cambian el dueño y los administradores.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir logo' })).not.toBeInTheDocument();
  });
});

describe('logo en el resto de la app', () => {
  it('arriba va el del negocio; sin logo, el de Opinara', async () => {
    const { unmount } = renderApp(['/']);
    const nav = await screen.findByRole('link', { name: 'Opinara' });
    expect(nav).toHaveAttribute('href', '/');
    unmount();

    givenMock.logo();
    renderApp(['/']);
    expect(await screen.findByRole('img', { name: 'Logo de Café de la Esquina' })).toHaveAttribute(
      'src',
      `${LOGO_URL}?v=${String(new Date('2026-10-01T12:00:00.000Z').getTime())}`,
    );
  });

  it('la hoja del QR lo lleva arriba del nombre', async () => {
    givenMock.logo();
    const { container } = renderApp(['/campaigns/urn:campaign:mostrador']);

    await screen.findByRole('img', { name: /Código QR de la campaña/ });
    const sheet = container.querySelector('.hoja-qr');
    expect(sheet?.querySelector(`img[src^="${LOGO_URL}"]`)).not.toBeNull();
  });

  it('la pantalla del QR lo pide por el slug, sin esperar para redirigir', async () => {
    session.clear();
    const replaceWith = vi.spyOn(browser, 'replaceWith').mockImplementation(() => undefined);
    const { container } = renderApp([`/r/${mockBusiness.slug}/mostrador`]);

    await waitFor(() => {
      expect(replaceWith).toHaveBeenCalled();
    });
    expect(container.querySelector(`img[src="${LOGO_URL}"]`)).not.toBeNull();
  });
});
