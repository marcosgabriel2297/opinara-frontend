import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness } from '@/mocks/fixtures';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

import { extractPlaceId } from './api/validation';

const ALTA = '/settings/locations/new';
const PLACE_ID = 'ChIJqdYnXOuYvJURvSXPqYwrpkQ';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
});

describe('alta manual de sucursales', () => {
  it('la crea y pide probar el link de reseña antes de imprimir', async () => {
    const { user } = renderApp([ALTA]);

    await user.type(await screen.findByLabelText('Nombre'), 'Palermo');
    await user.type(screen.getByLabelText('Place ID de Google'), PLACE_ID);
    await user.type(screen.getByLabelText('Dirección (opcional)'), 'Honduras 4800, CABA');
    await user.click(screen.getByRole('button', { name: 'Agregar sucursal' }));

    const status = await screen.findByRole('status');
    expect(within(status).getByRole('heading', { name: 'Agregamos Palermo' })).toBeInTheDocument();
    await waitFor(() => {
      expect(status).toHaveFocus();
    });
    expect(screen.getByRole('link', { name: /Probar el link de reseña/ })).toHaveAttribute(
      'href',
      `https://search.google.com/local/writereview?placeid=${PLACE_ID}`,
    );
    expect(screen.getByRole('link', { name: 'Crear una campaña' })).toHaveAttribute('href', '/campaigns');
    expect(mockState.manualLocations).toEqual([
      expect.objectContaining({ title: 'Palermo', placeId: PLACE_ID, address: 'Honduras 4800, CABA' }),
    ]);
  });

  it('acepta pegar el link de reseña en vez del Place ID', async () => {
    const { user } = renderApp([ALTA]);

    await user.type(await screen.findByLabelText('Nombre'), 'Palermo');
    await user.type(
      screen.getByLabelText('Place ID de Google'),
      `https://search.google.com/local/writereview?placeid=${PLACE_ID}`,
    );
    await user.click(screen.getByRole('button', { name: 'Agregar sucursal' }));

    expect(await screen.findByRole('heading', { name: 'Agregamos Palermo' })).toBeInTheDocument();
    expect(mockState.manualLocations[0]?.placeId).toBe(PLACE_ID);
    // Sin dirección no se manda el campo.
    expect(mockState.manualLocations[0]).not.toHaveProperty('address');
  });

  it('valida antes de mandar', async () => {
    const { user } = renderApp([ALTA]);

    await user.type(await screen.findByLabelText('Place ID de Google'), 'no es un id');
    await user.click(screen.getByRole('button', { name: 'Agregar sucursal' }));

    expect(await screen.findByText('Poné el nombre de la sucursal.')).toBeInTheDocument();
    expect(screen.getByText(/No parece un Place ID/)).toBeInTheDocument();
    expect(mockState.manualLocations).toHaveLength(0);
  });

  it('si la sucursal ya está, lo dice y deja corregir', async () => {
    const { user } = renderApp([ALTA]);

    // El Place ID de la sucursal importada de Google en los mocks.
    await user.type(await screen.findByLabelText('Nombre'), 'Centro');
    await user.type(screen.getByLabelText('Place ID de Google'), 'ChIJ18273645ficticio');
    await user.click(screen.getByRole('button', { name: 'Agregar sucursal' }));

    expect(await screen.findByText('Esa sucursal ya está en Opinara.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Centro');
  });

  it('a un MEMBER no le muestra el formulario', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp([ALTA]);

    expect(
      await screen.findByText('Solo el dueño o un administrador del negocio pueden agregar sucursales.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Place ID de Google')).not.toBeInTheDocument();
  });
});

describe('sucursales en Configuración', () => {
  it('lista las sucursales con su origen y lleva al alta', async () => {
    renderApp(['/settings']);

    const card = (await screen.findByRole('heading', { name: 'Sucursales' })).closest('[data-slot="card"]');
    expect(card).not.toBeNull();
    const scope = within(card as HTMLElement);
    expect(await scope.findByText('Café de la Esquina — Centro')).toBeInTheDocument();
    expect(scope.getByText('Google')).toBeInTheDocument();
    expect(scope.getByRole('link', { name: 'Agregar sucursal' })).toHaveAttribute('href', ALTA);
  });

  it('marca las manuales y explica que no traen reseñas', async () => {
    mockState.manualLocations.push({
      urn: 'urn:location:manual-1',
      source: 'MANUAL',
      title: 'Palermo',
      placeId: PLACE_ID,
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${PLACE_ID}`,
      hasVoiceOfMerchant: false,
      isActive: true,
      createdAt: '2026-10-27T12:00:00.000Z',
    });
    renderApp(['/settings']);

    expect(await screen.findByText('Palermo')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText(/Las manuales sirven para los QR, pero no traen reseñas/)).toBeInTheDocument();
  });

  it('a un MEMBER no le ofrece agregar', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp(['/settings']);

    expect(await screen.findByText('Café de la Esquina — Centro')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Agregar sucursal' })).not.toBeInTheDocument();
  });
});

describe('extractPlaceId', () => {
  it('saca el Place ID de los links de reseña y de Maps', () => {
    expect(extractPlaceId(` ${PLACE_ID} `)).toBe(PLACE_ID);
    expect(extractPlaceId(`https://search.google.com/local/writereview?placeid=${PLACE_ID}`)).toBe(PLACE_ID);
    expect(extractPlaceId(`https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`)).toBe(PLACE_ID);
  });
});
