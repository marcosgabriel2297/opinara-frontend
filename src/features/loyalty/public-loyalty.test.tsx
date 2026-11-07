import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness, mockLoyaltyMembers, mockLoyaltyProgram } from '@/mocks/fixtures';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp } from '@/test/render';

import { readCardTokens } from './card-storage';

const ANA = mockLoyaltyMembers[0]!;
const BRUNO = mockLoyaltyMembers[1]!;
const SIGNUP = `/f/${mockBusiness.slug}/${mockLoyaltyProgram.slug}`;

beforeEach(() => {
  // Lo público no necesita sesión: el cliente del comercio no tiene cuenta en Opinara.
  session.clear();
  localStorage.clear();
});

describe('el alta de la tarjeta', () => {
  it('muestra el premio y las condiciones del comercio', async () => {
    renderApp([SIGNUP]);

    expect(await screen.findByRole('heading', { name: 'Con 5 sellos: Un café gratis' })).toBeInTheDocument();
    expect(screen.getByText(mockBusiness.name)).toBeInTheDocument();
    expect(screen.getByText('No acumulable con otras promociones.')).toBeInTheDocument();
    expect(screen.queryByText(/reseña/i)).not.toBeInTheDocument();
  });

  it('exige aceptar las condiciones', async () => {
    const { user } = renderApp([SIGNUP]);

    await user.type(await screen.findByLabelText('Tu nombre'), 'Carla');
    await user.type(screen.getByLabelText('Celular'), '11 4444-5555');
    await user.click(screen.getByRole('button', { name: 'Sacar mi tarjeta' }));

    expect(await screen.findByText('Para sacar la tarjeta tenés que aceptar las condiciones.')).toBeInTheDocument();
    expect(mockState.loyalty.members).toHaveLength(2);
  });

  it('crea la tarjeta, la guarda en el teléfono y la muestra', async () => {
    const { user, router } = renderApp([SIGNUP]);

    await user.type(await screen.findByLabelText('Tu nombre'), 'Carla');
    await user.type(screen.getByLabelText('Celular'), '11 4444-5555');
    await user.click(screen.getByRole('checkbox', { name: /Acepto la política de privacidad/ }));
    await user.click(screen.getByRole('button', { name: 'Sacar mi tarjeta' }));

    expect(await screen.findByText('0 de 5 sellos')).toBeInTheDocument();
    expect(screen.getAllByText('Carla').length).toBeGreaterThan(0);
    expect(router.state.location.pathname).toBe('/card');
    expect(router.state.location.hash).toMatch(/^#token=/);
    expect(readCardTokens()).toHaveLength(1);
    // Recién creada, ofrece mandarse el link por WhatsApp al propio número.
    expect(screen.getByRole('heading', { name: '¡Listo, ya tenés tu tarjeta!' })).toBeInTheDocument();
    const whatsapp = screen.getByRole('link', { name: 'Mandarme el link por WhatsApp' });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5491144445555\?text=/);
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain('/card#token=');
    expect(mockState.loyalty.members.at(-1)).toMatchObject({
      name: 'Carla',
      phone: '+5491144445555',
      marketing: false,
    });
  });

  it('el campo trampa contra bots no se parece a nada que autocomplete el navegador', async () => {
    const { container } = renderApp([SIGNUP]);

    await screen.findByLabelText('Celular');
    const trap = container.querySelector('#signup-hp');
    expect(trap).not.toBeNull();
    expect(trap?.outerHTML).not.toMatch(/website|url|web/i);
    expect(trap).toHaveAttribute('autocomplete', 'off');
  });

  it('si el celular ya tiene tarjeta, no saca otra y dice cómo recuperarla', async () => {
    const { user } = renderApp([SIGNUP]);

    await user.type(await screen.findByLabelText('Tu nombre'), 'Ana');
    await user.type(screen.getByLabelText('Celular'), '011 15 2345-6789');
    await user.click(screen.getByRole('checkbox', { name: /Acepto la política de privacidad/ }));
    await user.click(screen.getByRole('button', { name: 'Sacar mi tarjeta' }));

    expect(await screen.findByText(/Ya tenés una tarjeta con ese celular/)).toBeInTheDocument();
    expect(mockState.loyalty.members).toHaveLength(2);
  });

  it('un programa pausado o inexistente no muestra el formulario', async () => {
    givenMock.loyaltyPrograms([{ ...mockLoyaltyProgram, status: 'PAUSED' }]);
    renderApp([SIGNUP]);

    expect(await screen.findByText('Esta tarjeta no está disponible')).toBeInTheDocument();
    expect(screen.queryByLabelText('Celular')).not.toBeInTheDocument();
  });
});

describe('la tarjeta', () => {
  it('muestra los sellos, lo que falta y el código para la caja', async () => {
    renderApp([`/card#token=${ANA.cardToken}`]);

    expect(await screen.findByText('3 de 5 sellos')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.getByText('Te faltan 2 sellos para: Un café gratis')).toBeInTheDocument();
    expect(screen.getByAltText('Código QR de tu tarjeta de sellos')).toBeInTheDocument();
    expect(screen.getByText('K3F 9QX')).toBeInTheDocument();
    expect(screen.queryByText(/reseña/i)).not.toBeInTheDocument();
  });

  it('desde "Tenela a mano" se puede mandar el link al propio WhatsApp', async () => {
    const { user } = renderApp([`/card#token=${ANA.cardToken}`]);

    await user.click(await screen.findByText('Tenela a mano'));

    const href = screen.getByRole('link', { name: 'Mandarme el link por WhatsApp' }).getAttribute('href') ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\/5491123456789\?text=/);
    expect(decodeURIComponent(href)).toContain(`/card#token=${ANA.cardToken}`);
    expect(screen.queryByRole('heading', { name: '¡Listo, ya tenés tu tarjeta!' })).not.toBeInTheDocument();
  });

  it('con la tarjeta completa, avisa el premio', async () => {
    renderApp([`/card#token=${BRUNO.cardToken}`]);

    expect(await screen.findByText('¡Tenés un premio! Pedilo en la caja: Un café gratis.')).toBeInTheDocument();
  });

  it('se recuerda en el teléfono: /card sin link abre la guardada', async () => {
    localStorage.setItem('opinara.loyalty-cards', JSON.stringify([ANA.cardToken]));
    const { router } = renderApp(['/card']);

    expect(await screen.findByText('3 de 5 sellos')).toBeInTheDocument();
    expect(router.state.location.hash).toBe(`#token=${ANA.cardToken}`);
  });

  it('con varias guardadas, deja elegir', async () => {
    localStorage.setItem('opinara.loyalty-cards', JSON.stringify([ANA.cardToken, BRUNO.cardToken]));
    const { user } = renderApp(['/card']);

    expect(await screen.findByRole('heading', { name: 'Tus tarjetas' })).toBeInTheDocument();
    const links = await screen.findAllByRole('link', { name: new RegExp(mockBusiness.name) });
    expect(links).toHaveLength(2);

    await user.click(links[1]!);
    expect(await screen.findByText('¡Tenés un premio! Pedilo en la caja: Un café gratis.')).toBeInTheDocument();
  });

  it('sin tarjetas guardadas ni link, explica cómo conseguirla', async () => {
    renderApp(['/card']);

    expect(await screen.findByText('No hay tarjetas guardadas en este teléfono')).toBeInTheDocument();
  });

  it('un link que ya no sirve se olvida', async () => {
    localStorage.setItem('opinara.loyalty-cards', JSON.stringify(['token-viejo']));
    renderApp(['/card#token=token-viejo']);

    expect(await screen.findByText('No encontramos tu tarjeta')).toBeInTheDocument();
    await waitFor(() => {
      expect(readCardTokens()).toEqual([]);
    });
  });

  it('el cliente borra sus datos, con confirmación', async () => {
    const { user } = renderApp([`/card#token=${ANA.cardToken}`]);

    await user.click(await screen.findByText('Tus datos'));
    expect(screen.getByText('ana@mail.test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Borrar mis datos' }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar todo' }));

    expect(await screen.findByText('Borramos tus datos')).toBeInTheDocument();
    expect(mockState.loyalty.members.some((member) => member.urn === ANA.urn)).toBe(false);
  });

  it('pausada (o fuera del plan), la tarjeta se sigue viendo', async () => {
    givenMock.withoutLoyalty();
    renderApp([`/card#token=${ANA.cardToken}`]);

    expect(await screen.findByText('3 de 5 sellos')).toBeInTheDocument();
    expect(screen.getByText('Por ahora esta tarjeta no suma sellos.')).toBeInTheDocument();
  });
});
