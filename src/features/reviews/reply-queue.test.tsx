import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL, session } from '@/lib/http';
import { apiErrorBody, mockReviews } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

const FILA = '/reviews/respond';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  sessionStorage.clear();
});

describe('modo foco', () => {
  it('muestra las sin responder de a una, la que más espera primero', async () => {
    renderApp([FILA]);

    expect(await screen.findByText('Reseña 1 de 3')).toBeInTheDocument();
    // La más vieja del mock es la de Valeria (23 de agosto).
    expect(screen.getByText('“Sin estrellas, solo texto.”')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu respuesta')).toHaveFocus();
  });

  it('publicar lleva a la siguiente y avisa con "Deshacer"', async () => {
    const { user } = renderApp([FILA]);

    await user.type(await screen.findByLabelText('Tu respuesta'), 'Gracias, Valeria.');
    await user.click(screen.getByRole('button', { name: /Publicar y seguir/ }));

    expect(await screen.findByText('Reseña 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Publicamos tu respuesta a Valeria.')).toBeInTheDocument();
    expect(mockState.reviews.find((review) => review.urn === 'urn:review:dddd4444')?.reply?.comment).toBe(
      'Gracias, Valeria.',
    );
    // La siguiente arranca vacía: nada del texto anterior.
    expect(screen.getByLabelText('Tu respuesta')).toHaveValue('');
  });

  it('"Deshacer" borra la respuesta en Google y vuelve a esa reseña con el texto', async () => {
    const { user } = renderApp([FILA]);

    await user.type(await screen.findByLabelText('Tu respuesta'), 'Gracias, Valeria.');
    await user.click(screen.getByRole('button', { name: /Publicar y seguir/ }));
    await screen.findByText('Reseña 2 de 3');
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText('Reseña 1 de 3')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockState.reviews.find((review) => review.urn === 'urn:review:dddd4444')?.reply).toBeUndefined();
    });
    expect(screen.getByLabelText('Tu respuesta')).toHaveValue('Gracias, Valeria.');
  });

  it('no publica una respuesta vacía', async () => {
    const { user } = renderApp([FILA]);

    await screen.findByText('Reseña 1 de 3');
    await user.click(screen.getByRole('button', { name: /Publicar y seguir/ }));

    expect(screen.getByText('Reseña 1 de 3')).toBeInTheDocument();
    expect(mockState.reviews.find((review) => review.urn === 'urn:review:dddd4444')?.reply).toBeUndefined();
  });

  it('saltear no publica nada y al final dice cuántas quedaron para después', async () => {
    const { user } = renderApp([FILA]);

    await screen.findByText('Reseña 1 de 3');
    for (let step = 0; step < 3; step += 1) {
      await user.click(screen.getByRole('button', { name: /Saltear/ }));
    }

    expect(await screen.findByRole('heading', { name: 'Estás al día.' })).toHaveFocus();
    expect(screen.getByText(/Dejaste 3 para después/)).toBeInTheDocument();
    expect(mockState.reviews.filter((review) => review.reply !== undefined)).toHaveLength(1);
  });

  it('con teclado: J saltea, K vuelve y ⌘/Ctrl+Enter publica', async () => {
    const { user } = renderApp([FILA]);

    await screen.findByText('Reseña 1 de 3');
    screen.getByLabelText('Tu respuesta').blur();
    await user.keyboard('j');
    expect(screen.getByText('Reseña 2 de 3')).toBeInTheDocument();
    screen.getByLabelText('Tu respuesta').blur();
    await user.keyboard('k');
    expect(screen.getByText('Reseña 1 de 3')).toBeInTheDocument();

    // Escribir una "j" en el texto no se mueve.
    await user.type(screen.getByLabelText('Tu respuesta'), 'jamás');
    expect(screen.getByText('Reseña 1 de 3')).toBeInTheDocument();

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(await screen.findByText('Reseña 2 de 3')).toBeInTheDocument();
  });

  it('la respuesta sugerida llena el texto para revisarla, sin publicar', async () => {
    const { user } = renderApp([FILA]);

    await user.click(await screen.findByRole('button', { name: 'Usar respuesta sugerida' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Tu respuesta')).toHaveValue(
        '¡Gracias, Valeria! Nos alegra un montón que la hayas pasado bien. Te esperamos pronto.',
      );
    });
    expect(screen.getByText('Pusimos una sugerencia: revisala antes de publicar.')).toBeInTheDocument();
    expect(screen.getByText('Reseña 1 de 3')).toBeInTheDocument();
  });

  it('sin sugerencias en el servidor no ofrece el botón', async () => {
    givenMock.replySuggestions('unavailable');
    renderApp([FILA]);

    await screen.findByText('Reseña 1 de 3');
    // El resumen llega aparte: se espera a que haya respondido antes de afirmar que no está.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Usar respuesta sugerida' })).not.toBeInTheDocument();
    });
  });

  it('si la sugerencia falla, lo dice y deja escribir', async () => {
    givenMock.replySuggestions('failed');
    const { user } = renderApp([FILA]);

    await user.click(await screen.findByRole('button', { name: 'Usar respuesta sugerida' }));

    expect(await screen.findByText(/No pudimos sugerir una respuesta/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tu respuesta')).toHaveValue('');
  });

  it('si Google revocó el acceso, ofrece reconectar y no avanza', async () => {
    server.use(
      http.put(`${API_BASE_URL}/businesses/:b/locations/:l/reviews/:r/reply`, () =>
        HttpResponse.json(apiErrorBody(403, 'GOOGLE_CONNECTION_REVOKED'), { status: 403 }),
      ),
    );
    const { user } = renderApp([FILA]);

    await user.type(await screen.findByLabelText('Tu respuesta'), 'Gracias.');
    await user.click(screen.getByRole('button', { name: /Publicar y seguir/ }));

    expect(await screen.findByRole('link', { name: 'Reconectar' })).toHaveAttribute('href', '/settings/google');
    expect(screen.getByText('Reseña 1 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu respuesta')).toHaveValue('Gracias.');
  });

  it('muestra cómo se va a ver en Google mientras se escribe', async () => {
    const { user } = renderApp([FILA]);

    await user.type(await screen.findByLabelText('Tu respuesta'), 'Gracias por escribir.');

    const preview = screen.getByRole('region', { name: 'Así se ve en Google' });
    expect(within(preview).getByText('Respuesta del propietario')).toBeInTheDocument();
    expect(within(preview).getByText('Gracias por escribir.')).toBeInTheDocument();
  });

  it('el borrador sobrevive a salir y volver', async () => {
    const first = renderApp([FILA]);
    await first.user.type(await screen.findByLabelText('Tu respuesta'), 'A medio escribir');
    first.unmount();

    renderApp([FILA]);
    expect(await screen.findByLabelText('Tu respuesta')).toHaveValue('A medio escribir');
  });

  it('sin pendientes lo dice y ofrece volver', async () => {
    givenMock.reviews(mockReviews.map((review) => ({ ...review, reply: { comment: 'Gracias' } })));
    renderApp([FILA]);

    expect(await screen.findByRole('heading', { name: 'No hay reseñas esperando respuesta.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a Hoy' })).toHaveAttribute('href', '/');
  });
});
