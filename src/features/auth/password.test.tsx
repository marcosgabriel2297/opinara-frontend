import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '@/lib/http';
import { mockResetToken, mockSession, mockUser } from '@/mocks/fixtures';
import { mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
  window.history.replaceState(null, '', '/');
});

/** El link del mail: el token viaja después de `#`. */
const openResetLink = (token: string) => {
  window.history.replaceState(null, '', `/reset-password#token=${token}`);
  return renderApp(['/reset-password']);
};

describe('recuperar la contraseña', () => {
  it('desde el login se pide el link, y la respuesta no confirma si la cuenta existe', async () => {
    const { user } = renderApp(['/login']);

    await user.click(await screen.findByRole('link', { name: '¿Te olvidaste la contraseña?' }));
    // El login también tiene "Email": primero, que haya cargado la otra pantalla.
    await screen.findByRole('heading', { name: 'Recuperá tu contraseña' });
    await user.type(screen.getByLabelText('Email'), 'quien@opinara.test');
    await user.click(screen.getByRole('button', { name: 'Mandarme el link' }));

    expect(await screen.findByRole('heading', { name: 'Revisá tu correo' })).toBeInTheDocument();
    expect(screen.getByText(/Si hay una cuenta con quien@opinara.test/)).toBeInTheDocument();
  });

  it('con el link elige una contraseña nueva, y el token sale de la barra de direcciones', async () => {
    const { user } = openResetLink(mockResetToken);

    const field = await screen.findByLabelText('Contraseña nueva');
    expect(window.location.hash).toBe('');

    await user.type(field, 'corta');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByText('La contraseña necesita al menos 8 caracteres.')).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, 'otraClaveSegura2');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByRole('heading', { name: 'Listo, ya tenés contraseña nueva' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(mockState.resetTokens.has(mockResetToken)).toBe(false);
  });

  it('un link vencido o ya usado lo dice y ofrece pedir otro', async () => {
    const { user } = openResetLink('un-token-que-ya-no-sirve-0123456789');

    await user.type(await screen.findByLabelText('Contraseña nueva'), 'otraClaveSegura2');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByRole('heading', { name: 'Este link ya no sirve' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir otro link' })).toHaveAttribute('href', '/forgot-password');
  });

  it('sin token en el link, directo al aviso', async () => {
    renderApp(['/reset-password']);
    expect(await screen.findByRole('heading', { name: 'Este link ya no sirve' })).toBeInTheDocument();
  });

  it('se puede abrir aunque haya una sesión abierta en ese navegador', async () => {
    signIn();
    openResetLink(mockResetToken);
    expect(await screen.findByLabelText('Contraseña nueva')).toBeInTheDocument();
  });
});

describe('cerrar sesión', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('revoca la sesión en el backend, no solo borra los tokens de este navegador', async () => {
    signIn();
    const { user } = renderApp(['/settings']);

    // Está en la columna lateral y en la tarjeta de la cuenta (jsdom no aplica el `lg:hidden`).
    const [logout] = await screen.findAllByRole('button', { name: 'Cerrar sesión' });
    await user.click(logout!);

    expect(await screen.findByRole('heading', { name: 'Entrá a tu cuenta' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockState.loggedOut).toEqual([mockSession.refreshToken]);
    });
    expect(session.getRefreshToken()).toBeNull();
  });

  it('"en todos los dispositivos" espera al backend y después sale', async () => {
    signIn();
    const { user } = renderApp(['/settings']);

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }));

    expect(await screen.findByRole('heading', { name: 'Entrá a tu cuenta' })).toBeInTheDocument();
    expect(mockState.loggedOutEverywhere).toBe(1);
    await act(() => Promise.resolve());
    expect(screen.queryByText(mockUser.email)).not.toBeInTheDocument();
  });
});
