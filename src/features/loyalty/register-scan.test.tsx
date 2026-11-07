import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '@/lib/http';
import { mockLoyaltyMembers, mockLoyaltyProgram } from '@/mocks/fixtures';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

// jsdom no tiene cámara: el lector se reemplaza por botones que "leen" un QR.
vi.mock('./components/qr-scanner', () => ({
  QrScanner: ({ onResult }: { onResult: (content: string) => void }) => (
    <div>
      <button type="button" onClick={() => onResult('opinara-card:B7N2WZ')}>
        leer tarjeta de Bruno
      </button>
      <button type="button" onClick={() => onResult('https://app.opinara.com.ar/r/cafe/mostrador')}>
        leer otro QR
      </button>
    </div>
  ),
}));

const NORTE = {
  ...mockLoyaltyProgram,
  urn: 'urn:loyalty-program:norte',
  slug: 'norte',
  location: { urn: 'urn:location:norte', title: 'Sucursal Norte', isActive: true },
};

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.clear();
});

describe('la caja con el lector de QR', () => {
  it('al leer una tarjeta la abre', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await user.click(await screen.findByRole('button', { name: 'Escanear tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'leer tarjeta de Bruno' }));

    expect(await screen.findByText('Bruno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canjear premio' })).toBeEnabled();
  });

  it('un QR que no es una tarjeta (por ejemplo, el de reseñas) no abre nada', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await user.click(await screen.findByRole('button', { name: 'Escanear tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'leer otro QR' }));

    expect(await screen.findByText('Ese QR no es una tarjeta de sellos.')).toBeInTheDocument();
  });

  it('una tarjeta de otra sucursal se ve, pero no suma acá', async () => {
    givenMock.loyaltyPrograms([mockLoyaltyProgram, NORTE]);
    givenMock.loyaltyMembers([{ ...mockLoyaltyMembers[1]!, programUrn: NORTE.urn }]);
    const { user } = renderApp(['/loyalty/register']);

    await user.click(await screen.findByRole('button', { name: mockLoyaltyProgram.location.title }));
    await user.click(await screen.findByRole('button', { name: 'Escanear tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'leer tarjeta de Bruno' }));

    expect(await screen.findByText('Esta tarjeta es de Sucursal Norte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sumar sello' })).not.toBeInTheDocument();
  });
});
