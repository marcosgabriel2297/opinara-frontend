import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { TEMPORARY_PASSWORD } from '@/mocks/handlers/auth';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
});

describe('páginas legales', () => {
  it('la política de privacidad se lee sin sesión, con la declaración de Uso Limitado de Google', async () => {
    const { router } = renderApp(['/privacy']);

    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/privacy');
    expect(screen.getByText('20-44450553-3')).toBeInTheDocument();
    expect(screen.getByText('20-40648005-5')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Política de datos del usuario de los servicios de las API de Google' }),
    ).toHaveAttribute('href', 'https://developers.google.com/terms/api-services-user-data-policy');
    expect(document.title).toBe('Política de privacidad · Opinara');
  });

  it('la política declara el formulario de contacto y sus proveedores', async () => {
    renderApp(['/privacy']);

    expect(await screen.findByRole('heading', { name: '3.7 Formulario de contacto y WhatsApp' })).toBeInTheDocument();
    expect(screen.getByText('FormSubmit')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare, Inc.')).toBeInTheDocument();
  });

  it('los términos se leen sin sesión y enlazan a la política de privacidad', async () => {
    const { user, router } = renderApp(['/terms']);

    const main = within(await screen.findByRole('main'));
    expect(main.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeInTheDocument();
    expect(main.getByText('Dylan Jonathan Salgado')).toBeInTheDocument();
    expect(main.getByText('Marcos Gabriel Vera')).toBeInTheDocument();

    await user.click(main.getAllByRole('link', { name: 'Política de privacidad' })[0]!);
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/privacy');
  });

  it('con sesión abierta también se ven, sin mandar al dashboard', async () => {
    signIn();
    const { router } = renderApp(['/terms']);

    expect(await screen.findByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/terms');
  });
});

describe('links legales en la entrada', () => {
  it('el login muestra los dos documentos y el mail de contacto', async () => {
    renderApp(['/login']);

    const nav = within(await screen.findByRole('navigation', { name: 'Información legal' }));
    expect(nav.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terms');
    expect(nav.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacy');
    expect(nav.getByRole('link', { name: 'opinara.soporte@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:opinara.soporte@gmail.com',
    );
  });

  it('el primer ingreso avisa qué se acepta, con links que abren en otra pestaña', async () => {
    const { user } = renderApp(['/login']);
    await user.type(await screen.findByLabelText('Email'), 'nuevo@opinara.test');
    await user.type(screen.getByLabelText('Contraseña'), TEMPORARY_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const terms = await screen.findByRole('link', { name: 'términos y condiciones' });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('target', '_blank');
  });
});
