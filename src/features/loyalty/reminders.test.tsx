import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness, mockLoyaltyMembers, mockLoyaltyProgram } from '@/mocks/fixtures';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

const ANA = mockLoyaltyMembers[0]!;
const BRUNO = mockLoyaltyMembers[1]!;
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
const programPath = `/loyalty/programs/${encodeURIComponent(mockLoyaltyProgram.urn)}`;

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.clear();
  // A Ana le faltan 2 sellos desde anteayer; Bruno ya tiene el premio.
  givenMock.loyaltyMembers([
    { ...ANA, lastStampAt: daysAgo(2) },
    { ...BRUNO, lastStampAt: daysAgo(2) },
  ]);
});

describe('los recordatorios por WhatsApp', () => {
  it('la tarjeta de sellos avisa cuántos hay y lleva a la lista', async () => {
    const { user } = renderApp(['/loyalty']);

    expect(await screen.findByText('1 cliente para recordarle')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ver recordatorios' }));

    expect(await screen.findByRole('heading', { name: 'Recordatorios' })).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument();
  });

  it('arma el mensaje con el link de la tarjeta al final, y al enviarlo lo saca de la lista', async () => {
    const { user } = renderApp(['/loyalty/reminders']);

    const message = `¡Hola, Ana! Te faltan solo 2 sellos en tu tarjeta de ${mockBusiness.name} para tu premio: ${mockLoyaltyProgram.rewardDescription}. ¡Te esperamos en ${mockLoyaltyProgram.location.title}! Acá tenés tu tarjeta:\nhttp://localhost:5173/card#token=${ANA.cardToken}`;
    expect(await screen.findByText('Le faltan 2 sellos · Último sello anteayer')).toBeInTheDocument();
    const send = screen.getByRole('link', { name: 'Enviar el recordatorio a Ana por WhatsApp' });
    expect(send).toHaveAttribute(
      'href',
      `https://wa.me/${ANA.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
    );
    expect(send).toHaveAttribute('target', '_blank');

    await user.click(send);

    expect(await screen.findByText(/Ana sale de la lista/)).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.lastReminderAt).not.toBeNull();
    expect(await screen.findByText('No hay recordatorios para mandar')).toBeInTheDocument();
  });

  it('también recomienda a quien no aceptó promociones: es un aviso de su tarjeta', async () => {
    givenMock.loyaltyMembers([{ ...ANA, marketing: false, lastStampAt: daysAgo(2) }, BRUNO]);
    renderApp(['/loyalty/reminders']);

    expect(await screen.findByRole('link', { name: 'Enviar el recordatorio a Ana por WhatsApp' })).toBeInTheDocument();
  });

  it('si el cliente pide no recibir más, el local lo saca de la lista', async () => {
    const { user } = renderApp(['/loyalty/reminders']);

    await user.click(await screen.findByRole('button', { name: 'Ana no quiere recibir más recordatorios' }));

    expect(await screen.findByText(/no le vamos a recomendar más recordatorios a Ana/)).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.remindersOptOutBy).toBe('BUSINESS');
    expect(await screen.findByText('No hay recordatorios para mandar')).toBeInTheDocument();
  });

  it('también recomienda a quien no viene hace 20 días o nunca estrenó la tarjeta, y filtra por motivo', async () => {
    givenMock.loyaltyMembers([
      { ...ANA, lastStampAt: daysAgo(2) },
      { ...BRUNO, stamps: 1, lastStampAt: daysAgo(25) },
      {
        ...ANA,
        urn: 'urn:loyalty-member:caro',
        memberCode: 'C4R0XX',
        name: 'Caro',
        phone: '+5491100000003',
        stamps: 0,
        lastStampAt: null,
        createdAt: daysAgo(30),
        cardToken: 'token-de-la-tarjeta-de-caro-0123456789abcdef',
      },
    ]);
    const { user } = renderApp(['/loyalty/reminders']);

    expect(await screen.findByText('No viene hace 25 días · 1 de 5 sellos')).toBeInTheDocument();
    expect(screen.getByText('Se sumó hace 30 días y no la estrenó')).toBeInTheDocument();
    const bruno = screen.getByText('Bruno').closest<HTMLElement>('[data-slot="card"]') ?? document.body;
    expect(within(bruno).getByText(/^¡Hola, Bruno! Hace rato que no te vemos/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Motivo'), 'Cerca del premio');
    await waitFor(() => {
      expect(screen.queryByText('Bruno')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('no recomienda a quien sumó un sello hoy: está en el local', async () => {
    givenMock.loyaltyMembers([{ ...ANA, lastStampAt: new Date().toISOString() }, BRUNO]);
    renderApp(['/loyalty/reminders']);

    expect(await screen.findByText('No hay recordatorios para mandar')).toBeInTheDocument();
  });

  it('un MEMBER no ve el aviso y la lista lo devuelve a las tarjetas', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp(['/loyalty/reminders']);

    expect(await screen.findByRole('heading', { name: 'Tarjeta de sellos' })).toBeInTheDocument();
    expect(screen.queryByText(/para recordarle/)).not.toBeInTheDocument();
  });
});

describe('el mensaje de recordatorio de la sucursal', () => {
  const settings = async (name = 'Recordatorio: cerca del premio') =>
    (await screen.findByRole('heading', { name })).closest<HTMLElement>('[data-slot="card"]') ?? document.body;

  it('arranca con el recomendado, muestra cómo le llega al cliente y guarda uno propio', async () => {
    const { user } = renderApp([programPath]);
    const card = await settings();

    expect(within(card).getByText('Es el mensaje que te recomendamos.')).toBeInTheDocument();
    const field = within(card).getByLabelText('Mensaje');
    await user.clear(field);
    await user.type(field, '{{nombre}, te esperamos en {{sucursal}');

    // La vista previa: el texto y, abajo, el link (el salto de línea se lee como un espacio).
    expect(
      within(card).getByText(
        `Ana, te esperamos en ${mockLoyaltyProgram.location.title} https://app.opinara.com.ar/card#…`,
      ),
    ).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Guardamos el recordatorio.')).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]).toMatchObject({
      reminderMessage: '{nombre}, te esperamos en {sucursal}',
      reminderMessageIsDefault: false,
    });

    await user.click(within(card).getByRole('button', { name: 'Usar el recomendado' }));
    expect(await screen.findByText('Volvimos al mensaje recomendado.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockState.loyalty.programs[0]?.reminderMessageIsDefault).toBe(true);
    });
  });

  it('el de "no viene" elige los días (20 de base) y muestra lo que ya juntó', async () => {
    const { user } = renderApp([programPath]);
    const card = await settings('Recordatorio: hace un tiempo que no viene');

    const days = within(card).getByLabelText('Días sin venir');
    expect(days).toHaveValue(20);
    await user.clear(days);
    await user.type(days, '15');
    const field = within(card).getByLabelText('Mensaje');
    await user.clear(field);
    await user.type(field, '{{nombre}, ya tenés {{sellos}');
    expect(within(card).getByText('Ana, ya tenés 1 de 5 sellos https://app.opinara.com.ar/card#…')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Guardamos el recordatorio.')).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]).toMatchObject({
      inactiveDays: 15,
      inactiveReminderMessage: '{nombre}, ya tenés {sellos}',
      inactiveReminderMessageIsDefault: false,
    });
  });

  it('no deja elegir menos de 7 días', async () => {
    const { user } = renderApp([programPath]);
    const card = await settings('Recordatorio: hace un tiempo que no viene');

    const days = within(card).getByLabelText('Días sin venir');
    await user.clear(days);
    await user.type(days, '3');
    await user.click(within(card).getByRole('button', { name: 'Guardar' }));

    expect(await within(card).findByText('Elegí entre 7 y 365 días.')).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]?.inactiveDays).toBe(20);
  });

  it('no deja usar variables que no existen', async () => {
    const { user } = renderApp([programPath]);
    const card = await settings();

    const field = within(card).getByLabelText('Mensaje');
    await user.clear(field);
    await user.type(field, 'Hola {{apellido}');
    await user.click(within(card).getByRole('button', { name: 'Guardar' }));

    expect(await within(card).findByText(/Solo podés usar \{nombre\}/)).toBeInTheDocument();
    expect(mockState.loyalty.programs[0]?.reminderMessageIsDefault).toBe(true);
  });
});

describe('dejar de mandarle recordatorios desde la lista de clientes', () => {
  it('el local lo apaga y lo vuelve a prender', async () => {
    const { user } = renderApp([programPath]);

    await user.click(await screen.findByRole('button', { name: 'No mandarle más recordatorios a Ana' }));
    expect(await screen.findByText('Sin recordatorios')).toBeInTheDocument();
    expect(mockState.loyalty.members[0]?.remindersOptOutBy).toBe('BUSINESS');

    await user.click(await screen.findByRole('button', { name: 'Volver a mandarle recordatorios a Ana' }));
    await waitFor(() => {
      expect(mockState.loyalty.members[0]?.remindersOptOutBy).toBeNull();
    });
  });

  it('si los apagó el cliente desde su tarjeta, el local no los puede prender', async () => {
    givenMock.loyaltyMembers([{ ...ANA, remindersOptOutBy: 'CLIENT' }, BRUNO]);
    renderApp([programPath]);

    expect(await screen.findByText('Sin recordatorios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /recordatorios a Ana/ })).not.toBeInTheDocument();
  });
});
