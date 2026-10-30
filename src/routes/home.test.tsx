import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { session } from '@/lib/http';
import { mockReviews } from '@/mocks/fixtures';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  sessionStorage.clear();
});

describe('Hoy', () => {
  it('dice cuántas esperan respuesta y lleva al modo foco', async () => {
    renderApp(['/']);

    const title = await screen.findByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Tenés 3 reseñas esperando tu respuesta.');
    expect(screen.getByRole('link', { name: /Empezar a responder/ })).toHaveAttribute('href', '/reviews/respond');
  });

  it('muestra las primeras de la fila, la que más espera primero', async () => {
    renderApp(['/']);

    const section = (await screen.findByRole('heading', { name: 'Próximas en la fila' })).closest('section')!;
    const items = await within(section).findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Sin estrellas, solo texto.');
    expect(within(section).getByRole('link', { name: 'Ver las 3' })).toHaveAttribute('href', '/reviews/respond');
  });

  it('el promedio no cuenta las reseñas sin calificación', async () => {
    renderApp(['/']);

    // 5, 2 y 4 (la de 0 no cuenta): 3,67 → "3,7".
    expect(await screen.findByText('3,7')).toBeInTheDocument();
    expect(screen.getByText('4 reseñas en total')).toBeInTheDocument();
  });

  it('con todo respondido no ofrece un botón que no lleva a nada', async () => {
    givenMock.reviews(mockReviews.map((review) => ({ ...review, reply: { comment: 'Gracias' } })));
    renderApp(['/']);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Respondiste todas tus reseñas.');
    expect(screen.queryByRole('link', { name: /Empezar a responder/ })).not.toBeInTheDocument();
  });

  it('muestra los escaneos totales y su evolución por semana, también como tabla', async () => {
    renderApp(['/']);

    expect(await screen.findByText('escaneos en total')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Escaneos por semana' });
    // 12 semanas + el encabezado.
    expect(within(table).getAllByRole('row')).toHaveLength(13);
    expect(within(table).getAllByRole('row').at(-1)).toHaveTextContent('45');
  });

  it('con escaneos solo de antes del registro por fecha, explica en vez de dibujar columnas vacías', async () => {
    givenMock.scanWeeks([]);
    renderApp(['/']);

    expect(await screen.findByText('escaneos en total')).toBeInTheDocument();
    expect(await screen.findByText(/Todavía no hay escaneos con fecha/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Escaneos por semana' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Semana del/)).not.toBeInTheDocument();
  });

  it('sin Google ni sucursales, guía con los primeros pasos', async () => {
    givenMock.connection(null);
    givenMock.noImportedLocations();
    renderApp(['/']);

    const steps = (await screen.findByRole('heading', { name: 'Primeros pasos' })).closest('section')!;
    const current = within(steps)
      .getAllByRole('listitem')
      .filter((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Conectar tu cuenta de Google');
    expect(within(current[0]!).getByRole('link', { name: /Seguir/ })).toHaveAttribute('href', '/settings/google');
  });

  it('la navegación avisa cuántas esperan respuesta', async () => {
    renderApp(['/']);

    const nav = await screen.findByRole('navigation', { name: 'Secciones' });
    expect(await within(nav).findByRole('link', { name: 'Reseñas, 3 sin responder' })).toHaveAttribute(
      'href',
      '/reviews',
    );
  });
});
