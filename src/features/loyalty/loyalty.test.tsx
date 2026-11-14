import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness, mockLoyaltyMembers, mockLoyaltyProgram } from '@/mocks/fixtures';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

const ANA = mockLoyaltyMembers[0]!;
const BRUNO = mockLoyaltyMembers[1]!;
const programPath = `/loyalty/programs/${encodeURIComponent(mockLoyaltyProgram.urn)}`;

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.clear();
});

describe('la sección de la tarjeta de sellos', () => {
  it('aparece en la navegación', async () => {
    renderApp(['/']);

    expect(await screen.findByRole('link', { name: 'Sellos' })).toHaveAttribute('href', '/loyalty');
  });

  it('si el plan no la incluye, explica qué es en vez de esconderla', async () => {
    givenMock.withoutLoyalty();
    renderApp(['/loyalty']);

    expect(await screen.findByText('La tarjeta de sellos viene en otro plan')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Abrir la caja/ })).not.toBeInTheDocument();
  });

  it('lista las tarjetas por sucursal con sus cifras y lleva a la caja', async () => {
    renderApp(['/loyalty']);

    expect(await screen.findByRole('link', { name: mockLoyaltyProgram.location.title })).toBeInTheDocument();
    expect(screen.getByText('Con 5 sellos: Un café gratis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir la caja/ })).toHaveAttribute('href', '/loyalty/register');
  });

  it('crea la tarjeta de una sucursal y va derecho a su QR', async () => {
    givenMock.loyaltyPrograms([]);
    const { user } = renderApp(['/loyalty']);

    await user.click(await screen.findByRole('button', { name: 'Crear tarjeta' }));
    await user.type(screen.getByLabelText('Premio'), 'Una medialuna');
    await user.click(screen.getByRole('button', { name: 'Crear tarjeta' }));

    expect(await screen.findByRole('heading', { name: mockLoyaltyProgram.location.title })).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]).toMatchObject({ rewardDescription: 'Una medialuna', stampsRequired: 5 });
  });

  it('valida el premio y los sellos antes de enviar', async () => {
    givenMock.loyaltyPrograms([]);
    const { user } = renderApp(['/loyalty']);

    await user.click(await screen.findByRole('button', { name: 'Crear tarjeta' }));
    await user.clear(screen.getByLabelText('Sellos para el premio'));
    await user.type(screen.getByLabelText('Sellos para el premio'), '40');
    await user.click(screen.getByRole('button', { name: 'Crear tarjeta' }));

    expect(await screen.findByText('Escribí el premio.')).toBeInTheDocument();
    expect(screen.getByText('Elegí entre 2 y 20 sellos.')).toBeInTheDocument();
    expect(mockState.loyalty.programs).toHaveLength(0);
  });
});

describe('el detalle de una tarjeta', () => {
  it('muestra el QR de alta con sus propios textos, sin hablar de reseñas', async () => {
    renderApp([programPath]);

    expect(
      await screen.findByAltText(`Código QR para sacar la tarjeta de sellos de ${mockLoyaltyProgram.location.title}`),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Sumá sellos y llevate un premio').length).toBeGreaterThan(0);
    // En el contenido: la navegación sí tiene la pestaña "Reseñas".
    expect(within(screen.getByRole('main')).queryByText(/reseña/i)).not.toBeInTheDocument();
  });

  it('lista los clientes y los busca por los últimos dígitos del celular', async () => {
    const { user } = renderApp([programPath]);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar clientes'), '6789');

    await waitFor(() => {
      expect(screen.queryByText('Bruno')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('avisa que cambiar los sellos afecta a todas las tarjetas, y guarda', async () => {
    const { user } = renderApp([programPath]);

    const stamps = await screen.findByLabelText('Sellos para el premio');
    await user.clear(stamps);
    await user.type(stamps, '8');

    expect(screen.getByText(/rige para todas las tarjetas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Guardamos los cambios.')).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]?.stampsRequired).toBe(8);
  });

  it('pausa la tarjeta', async () => {
    const { user } = renderApp([programPath]);

    await user.click(await screen.findByRole('button', { name: 'Pausar la tarjeta' }));

    expect(await screen.findByText(/Pausada: no se suman clientes ni sellos/)).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]?.status).toBe('PAUSED');
  });

  it('un MEMBER ve los clientes pero no configura ni imprime', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp([programPath]);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('El QR lo imprimen el dueño o un administrador del negocio.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Borrar a/ })).not.toBeInTheDocument();
  });
});

describe('la caja', () => {
  const openCard = async (user: ReturnType<typeof renderApp>['user'], name: string, search: string) => {
    await user.type(await screen.findByLabelText('Buscar cliente'), search);
    await user.click(await screen.findByRole('button', { name: new RegExp(name) }));
  };

  it('con una sola sucursal con tarjeta, no pregunta en cuál está', async () => {
    renderApp(['/loyalty/register']);

    expect(
      await screen.findByRole('heading', { name: `Caja de ${mockLoyaltyProgram.location.title}` }),
    ).toBeInTheDocument();
  });

  it('con varias, pregunta una vez y lo recuerda', async () => {
    givenMock.loyaltyPrograms([
      mockLoyaltyProgram,
      {
        ...mockLoyaltyProgram,
        urn: 'urn:loyalty-program:norte',
        slug: 'norte',
        location: { urn: 'urn:location:norte', title: 'Sucursal Norte', isActive: true },
      },
    ]);
    const { user, unmount } = renderApp(['/loyalty/register']);

    await user.click(await screen.findByRole('button', { name: 'Sucursal Norte' }));
    expect(await screen.findByRole('heading', { name: 'Caja de Sucursal Norte' })).toBeInTheDocument();

    unmount();
    renderApp(['/loyalty/register']);
    expect(await screen.findByRole('heading', { name: 'Caja de Sucursal Norte' })).toBeInTheDocument();
  });

  it('busca al cliente, suma un sello y lo deshace', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', '6789');
    expect(await screen.findByText('3 de 5 sellos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sumar sello' }));
    expect(await screen.findByText('Sello sumado: 4 de 5.')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.stamps).toBe(4);

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Listo, lo deshicimos.')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.stamps).toBe(3);
  });

  it('el ADMIN saca sellos puestos por error y lo puede deshacer', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'ADMIN' }]);
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Quitar sellos' }));
    expect(screen.getByRole('button', { name: 'Uno menos' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Uno más' }));
    await user.click(screen.getByRole('button', { name: 'Quitar 2 sellos' }));

    expect(await screen.findByText('Le sacamos 2 sellos. Quedan 1 de 5.')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]).toMatchObject({ stamps: 1, totalStamps: ANA.totalStamps - 2 });

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Listo, lo deshicimos.')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.stamps).toBe(3);
  });

  it('no deja sacar más sellos de los que tiene', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'ADMIN' }]);
    givenMock.loyaltyMembers([{ ...ANA, stamps: 1 }, BRUNO]);
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Quitar sellos' }));

    expect(screen.getByRole('button', { name: 'Uno más' })).toBeDisabled();
  });

  it.each(['OWNER', 'MEMBER'] as const)('un %s no ve "Quitar sellos"', async (role) => {
    givenMock.businesses([{ ...mockBusiness, role }]);
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await screen.findByText('3 de 5 sellos');

    expect(screen.queryByRole('button', { name: 'Quitar sellos' })).not.toBeInTheDocument();
  });

  it('después de un sello, dice desde cuándo se puede sumar otro y no deja tocar antes', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Sumar sello' }));
    await screen.findByText('Sello sumado: 4 de 5.');

    const next = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(
      Date.parse(mockState.loyalty.members[0]?.lastStampAt ?? '') + 10 * 60 * 1000,
    );
    const button = screen.getByRole('button', { name: 'Sumar sello' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(`Próximo sello desde las ${next}`);
    expect(screen.getByText(/Faltan (10:00|9:5\d)/)).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.stamps).toBe(4);
  });

  it('al cumplirse el tiempo mínimo, "Sumar sello" se vuelve a habilitar solo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const lastStampAt = new Date(Date.now() - 10 * 60 * 1000 + 5000).toISOString();
      givenMock.loyaltyMembers([{ ...ANA, lastStampAt }, BRUNO]);
      const { user } = renderApp(['/loyalty/register']);

      await openCard(user, 'Ana', 'ana');
      expect(await screen.findByRole('button', { name: 'Sumar sello' })).toBeDisabled();
      expect(screen.getByText(/Faltan 0:0\d/)).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(6000);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sumar sello' })).toBeEnabled();
      });
      expect(screen.queryByText(/Próximo sello desde/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('avisa el premio al completar la tarjeta y lo canjea', async () => {
    givenMock.loyaltyMembers([{ ...ANA, stamps: 4 }, BRUNO]);
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Sumar sello' }));
    expect(await screen.findByText('¡Completó la tarjeta! Ya puede canjear: Un café gratis.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Canjear premio' }));
    expect(await screen.findByText('Premio canjeado: Un café gratis.')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]).toMatchObject({ stamps: 0, totalRedemptions: 1 });
  });

  it('sin sellos suficientes, "Canjear premio" no se puede tocar', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');

    expect(await screen.findByRole('button', { name: 'Canjear premio' })).toBeDisabled();
  });

  it('encuentra la tarjeta por su código, aunque lo dicten en minúsculas', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Bruno', 'b7n 2wz');

    expect(await screen.findByText('¡Tiene un premio!', { exact: false })).toBeInTheDocument();
  });

  it('sin cámara, lo dice y deja buscar por celular', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await user.click(await screen.findByRole('button', { name: 'Escanear tarjeta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos usar la cámara');
    expect(screen.getByLabelText('Buscar cliente')).toBeInTheDocument();
  });

  it('manda la tarjeta por WhatsApp desde la caja, sin cambiar el link', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    const whatsapp = await screen.findByRole('link', { name: 'Enviar su tarjeta por WhatsApp' });

    const href = new URL(whatsapp.getAttribute('href') ?? '');
    expect(href.origin + href.pathname).toBe('https://wa.me/5491123456789');
    const text = href.searchParams.get('text') ?? '';
    expect(text).toContain('¡Hola, Ana!');
    expect(text).toContain(`card#token=${ANA.cardToken}`);
    expect(text).not.toMatch(/reseña/i);
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(mockState.loyalty.members[0]?.cardToken).toBe(ANA.cardToken);
  });

  it('muestra el link de la tarjeta como QR, para que lo escanee', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Mostrar el link de su tarjeta como QR' }));

    expect(await screen.findByAltText('Código QR con el link de la tarjeta de Ana')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.cardToken).toBe(ANA.cardToken);
  });

  it('"Siguiente cliente" vuelve a la búsqueda vacía', async () => {
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');
    await user.click(await screen.findByRole('button', { name: 'Siguiente cliente' }));

    expect(await screen.findByLabelText('Buscar cliente')).toHaveValue('');
  });

  it('si la tarjeta de la caja está pausada, no ofrece sumar', async () => {
    givenMock.loyaltyPrograms([{ ...mockLoyaltyProgram, status: 'PAUSED' }]);
    const { user } = renderApp(['/loyalty/register']);

    await openCard(user, 'Ana', 'ana');

    const panel = await screen.findByText(/está pausada: no suma sellos/);
    expect(within(panel.closest('[role="alert"]') ?? document.body).getByText(/pausada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sumar sello' })).not.toBeInTheDocument();
  });
});
