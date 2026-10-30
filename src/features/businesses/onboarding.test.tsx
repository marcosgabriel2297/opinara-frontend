import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness } from '@/mocks/fixtures';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
});

describe('onboarding', () => {
  it('manda a crear un negocio a quien no tiene ninguno', async () => {
    givenMock.noBusinesses();
    const { router } = renderApp(['/reviews']);

    expect(await screen.findByRole('heading', { name: 'Creá tu negocio' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });

  it('crea el negocio y sigue con la conexión de Google', async () => {
    givenMock.noBusinesses();
    const { user, router } = renderApp(['/onboarding']);

    await user.type(await screen.findByLabelText('Nombre del negocio'), 'Panadería La Esquina');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/settings/google');
    });
    // Queda seleccionado el recién creado, no el primero de la lista.
    expect(localStorage.getItem('opinara.business')).toBe('urn:business:panaderia-la-esquina');
  });

  it('muestra la vista previa del link del QR mientras escribe', async () => {
    givenMock.noBusinesses();
    const { user } = renderApp(['/onboarding']);

    await user.type(await screen.findByLabelText('Nombre del negocio'), 'Café de la Esquina');

    expect(await screen.findByText(/\/r\/cafe-de-la-esquina\//)).toBeInTheDocument();
  });

  it('avisa cuando el identificador ya está en uso', async () => {
    const { user } = renderApp(['/onboarding']);

    await user.type(await screen.findByLabelText('Nombre del negocio'), mockBusiness.name);
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese identificador ya está en uso.');
  });

  it('con un nombre sin letras pide el identificador a mano y lleva el foco ahí', async () => {
    givenMock.noBusinesses();
    const { user } = renderApp(['/onboarding']);

    await user.type(await screen.findByLabelText('Nombre del negocio'), '☕☕☕');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Escribí uno a mano');
    await waitFor(() => {
      expect(screen.getByLabelText('Identificador en la URL')).toHaveFocus();
    });
  });

  it('no muestra el selector de negocios cuando hay uno solo', async () => {
    renderApp(['/reviews']);

    await screen.findByRole('heading', { name: 'Reseñas' });
    expect(screen.queryByLabelText('Cambiar de negocio')).not.toBeInTheDocument();
  });

  it('muestra el selector cuando hay más de un negocio', async () => {
    givenMock.businesses([
      mockBusiness,
      { ...mockBusiness, urn: 'urn:business:otro', name: 'Peluquería', slug: 'peluqueria' },
    ]);
    renderApp(['/reviews']);

    expect(await screen.findByLabelText('Cambiar de negocio')).toBeInTheDocument();
  });
});
