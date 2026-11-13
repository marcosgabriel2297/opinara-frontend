import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

import { businessSchema } from './api/schemas';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.clear();
});

describe('plan de solo fidelización', () => {
  it('la portada es la tarjeta de sellos y la navegación no tiene "Hoy"', async () => {
    givenMock.onlyLoyalty();
    const { router } = renderApp(['/']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/loyalty');
    });
    const nav = within(await screen.findByRole('navigation', { name: 'Secciones' }));
    expect(nav.queryByRole('link', { name: 'Hoy' })).not.toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Sellos' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Abrir la caja/ })).toBeInTheDocument();
    // Nada le pidió reseñas al backend: si no, el mock habría respondido 403 y se vería el error.
    expect(screen.queryByText(/no incluye esto/)).not.toBeInTheDocument();
  });

  it('reseñas y QR explican que vienen en otro plan', async () => {
    givenMock.onlyLoyalty();
    const { unmount } = renderApp(['/reviews']);

    expect(await screen.findByText('Las reseñas vienen en otro plan')).toBeInTheDocument();
    unmount();

    renderApp(['/campaigns']);
    expect(await screen.findByText('Las reseñas vienen en otro plan')).toBeInTheDocument();
  });

  it('el modo foco también', async () => {
    givenMock.onlyLoyalty();
    renderApp(['/reviews/respond']);

    expect(await screen.findByText('Las reseñas vienen en otro plan')).toBeInTheDocument();
  });

  it('con reseñas en el plan, todo sigue como siempre', async () => {
    givenMock.withoutLoyalty();
    renderApp(['/']);

    const nav = within(await screen.findByRole('navigation', { name: 'Secciones' }));
    expect(nav.getByRole('link', { name: 'Hoy' })).toBeInTheDocument();
  });
});

describe('las funcionalidades del negocio', () => {
  const base = {
    urn: 'urn:business:x',
    name: 'X',
    slug: 'x',
    status: 'ACTIVE',
    timezone: 'America/Argentina/Buenos_Aires',
    createdAt: '2026-01-01T00:00:00.000Z',
    logoUpdatedAt: null,
    role: 'OWNER',
  };

  it('toma las que manda el backend e ignora las que no conoce', () => {
    expect(businessSchema.parse({ ...base, plan: 'LOYALTY', features: ['LOYALTY', 'OTRA'] }).features).toEqual([
      'LOYALTY',
    ]);
  });

  it('con un backend anterior a los planes (o a REVIEWS), las reseñas siguen estando', () => {
    expect(businessSchema.parse(base).features).toEqual(['REVIEWS']);
    expect(businessSchema.parse({ ...base, plan: 'REVIEWS', features: [] }).features).toEqual(['REVIEWS']);
    expect(businessSchema.parse({ ...base, plan: 'REVIEWS_LOYALTY', features: ['LOYALTY'] }).features).toEqual([
      'REVIEWS',
      'LOYALTY',
    ]);
  });
});
