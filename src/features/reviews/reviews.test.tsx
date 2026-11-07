import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL, session } from '@/lib/http';
import { apiErrorBody, mockImportedLocation, mockReviews } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

const LISTA = '/reviews';
const detalle = (reviewUrn: string) =>
  `/reviews/${encodeURIComponent(mockImportedLocation.urn)}/${encodeURIComponent(reviewUrn)}`;

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  // Los borradores de respuesta viven acá: que no pasen de un test a otro.
  sessionStorage.clear();
});

describe('listado', () => {
  it('muestra las reseñas de la sucursal y fija la sucursal en la URL', async () => {
    const { router } = renderApp([LISTA]);

    expect(await screen.findByText('Excelente atención y el café es el mejor del barrio.')).toBeInTheDocument();
    // La URL queda completa para poder compartirla.
    await waitFor(() => {
      expect(router.state.location.search).toContain('location=');
    });
  });

  it('a una reseña anónima no le inventa nombre ni foto', async () => {
    renderApp([LISTA]);

    expect(await screen.findByText('Anónimo')).toBeInTheDocument();
    // Solo la reseña con foto tiene <img>: a la anónima no le inventamos una.
    expect(document.querySelectorAll('img')).toHaveLength(1);
  });

  it('si la foto de perfil no carga, cae al avatar por defecto', async () => {
    renderApp([LISTA]);

    await screen.findByText('Ana Pérez');
    const photo = document.querySelector('img');
    expect(photo).not.toBeNull();

    // Una URL de foto de Google puede fallar: borrada, hotlink bloqueado, sin conexión.
    photo?.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(document.querySelectorAll('img')).toHaveLength(0);
    });
  });

  it('aguanta una reseña sin comentario', async () => {
    renderApp([LISTA]);

    expect(await screen.findByText('Solo calificación, sin comentario.')).toBeInTheDocument();
  });

  it('con rating 0 dice que no hay calificación, en vez de dibujar cero estrellas', async () => {
    renderApp([LISTA]);

    expect(await screen.findByText('Sin calificación')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '0 de 5 estrellas' })).not.toBeInTheDocument();
  });

  it('anuncia la calificación para quien no ve las estrellas', async () => {
    renderApp([LISTA]);

    expect(await screen.findByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument();
  });

  it('marca las que están sin responder', async () => {
    renderApp([LISTA]);

    await screen.findByText('Excelente atención y el café es el mejor del barrio.');
    // Tres de las cuatro no tienen respuesta (el cuarto match es la opción del filtro).
    expect(screen.getAllByText('Sin responder', { selector: 'span' })).toHaveLength(3);
  });
});

describe('filtros', () => {
  it('filtra por calificación y lo deja en la URL', async () => {
    const { user, router } = renderApp([LISTA]);

    await user.selectOptions(await screen.findByLabelText('Calificación'), '2');

    await waitFor(() => {
      expect(router.state.location.search).toContain('rating=2');
    });
    expect(await screen.findByText('Esperamos 40 minutos por dos cafés.')).toBeInTheDocument();
    expect(screen.queryByText('Excelente atención y el café es el mejor del barrio.')).not.toBeInTheDocument();
  });

  it('filtra por sin responder', async () => {
    const { user } = renderApp([LISTA]);

    await user.selectOptions(await screen.findByLabelText('Respuesta'), 'no');

    await waitFor(() => {
      expect(screen.queryByText('Esperamos 40 minutos por dos cafés.')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Excelente atención y el café es el mejor del barrio.')).toBeInTheDocument();
  });

  it('arranca leyendo los filtros de la URL', async () => {
    renderApp([`${LISTA}?location=${encodeURIComponent(mockImportedLocation.urn)}&rating=2&replied=yes`]);

    expect(await screen.findByText('Esperamos 40 minutos por dos cafés.')).toBeInTheDocument();
    expect(screen.getByLabelText('Calificación')).toHaveValue('2');
    expect(screen.getByLabelText('Respuesta')).toHaveValue('yes');
  });

  it('cuando no hay resultados ofrece limpiar los filtros', async () => {
    const { user } = renderApp([`${LISTA}?rating=3`]);

    expect(await screen.findByText('Ninguna reseña coincide con esos filtros')).toBeInTheDocument();

    // Con la lista vacía, el único botón es el del estado vacío.
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(await screen.findByText('Excelente atención y el café es el mejor del barrio.')).toBeInTheDocument();
  });

  it('distingue "no hay reseñas" de "no hay resultados con estos filtros"', async () => {
    givenMock.reviews([]);
    renderApp([LISTA]);

    expect(await screen.findByText('Todavía no hay reseñas')).toBeInTheDocument();
  });

  // Sin la API de Google aprobada no entra ninguna reseña: responder en Google es la única salida.
  it('sin reseñas ofrece responder en Google, con las reseñas de la sucursal', async () => {
    givenMock.reviews([]);
    renderApp([LISTA]);

    await screen.findByText('Todavía no hay reseñas');
    const links = screen.getAllByRole('link', { name: /Responder en Google/ });
    // Una sola vez: en el estado vacío, no repetido al costado.
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://search.google.com/local/reviews?placeid=ChIJ18273645ficticio');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAccessibleName(/se abre en otra pestaña/);
  });

  it('con reseñas, "Responder en Google" queda al costado', async () => {
    renderApp([LISTA]);

    await screen.findByText('Excelente atención y el café es el mejor del barrio.');
    expect(screen.getByRole('link', { name: /Responder en Google/ })).toHaveAttribute(
      'href',
      'https://search.google.com/local/reviews?placeid=ChIJ18273645ficticio',
    );
  });

  // El backend sincroniza solo: no hay botón, solo el aviso de que están al día.
  it('no ofrece sincronizar a mano: avisa que se actualizan solas', async () => {
    renderApp([LISTA]);

    await screen.findByText('Excelente atención y el café es el mejor del barrio.');
    expect(screen.queryByRole('button', { name: /Sincronizar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Se actualizan solas con Google/)).toBeInTheDocument();
  });

  it('sin reseñas, avisa que se actualizan solas también en el estado vacío', async () => {
    givenMock.reviews([]);
    renderApp([LISTA]);

    await screen.findByText('Todavía no hay reseñas');
    expect(screen.getByText(/Se actualizan solas con Google/)).toBeInTheDocument();
  });

  it('sin sucursales importadas lleva a conectar Google', async () => {
    givenMock.noImportedLocations();
    renderApp([LISTA]);

    expect(await screen.findByText('Todavía no importaste sucursales')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a la conexión con Google' })).toHaveAttribute(
      'href',
      '/settings/google',
    );
  });
});

describe('sin responder', () => {
  /** Cuenta los pedidos del contador (los que piden una sola reseña sin responder). */
  function countCounterRequests() {
    const counter = { calls: 0 };
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/reviews') && url.searchParams.get('limit') === '1') counter.calls += 1;
    });
    return counter;
  }

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('dice cuántas esperan respuesta, con el total de la API', async () => {
    renderApp([LISTA]);

    // En el mock hay 3 sin responder: Ana, la anónima y Valeria.
    expect(await screen.findByRole('button', { name: '3 sin responder' })).toBeInTheDocument();
  });

  it('tocarlo muestra solo esas', async () => {
    const { user, router } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: '3 sin responder' }));

    await waitFor(() => {
      expect(router.state.location.search).toContain('replied=no');
    });
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    // Ya filtrado, es texto: no tiene sentido un botón que no cambia nada.
    expect(screen.getByText('3 sin responder')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 sin responder' })).not.toBeInTheDocument();
  });

  it('con el listado ya filtrado no hace un pedido extra: usa el total del listado', async () => {
    const counter = countCounterRequests();
    renderApp([`${LISTA}?replied=no`]);

    expect(await screen.findByText('3 sin responder')).toBeInTheDocument();
    expect(counter.calls).toBe(0);
  });

  it('sin pendientes lo dice', async () => {
    givenMock.reviews([mockReviews[1]!]);
    renderApp([LISTA]);

    expect(await screen.findByText('Todas respondidas')).toBeInTheDocument();
  });

  it('con varias sucursales aclara que el número es de la elegida', async () => {
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () =>
        HttpResponse.json([
          {
            urn: mockImportedLocation.urn,
            title: 'Centro',
            hasVoiceOfMerchant: true,
            isActive: true,
            createdAt: '2026-06-16T02:26:10.637Z',
          },
          {
            urn: 'urn:location:palermo',
            title: 'Palermo',
            hasVoiceOfMerchant: true,
            isActive: true,
            createdAt: '2026-06-16T02:26:10.637Z',
          },
        ]),
      ),
    );
    renderApp([LISTA]);

    expect(await screen.findByRole('button', { name: '3 sin responder en esta sucursal' })).toBeInTheDocument();
  });

  it('se actualiza después de responder', async () => {
    const { user } = renderApp([LISTA]);

    await screen.findByRole('button', { name: '3 sin responder' });
    await user.click(screen.getAllByRole('link', { name: /^Responder (a |la reseña)/ })[0]!);
    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias por pasar.');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));
    await screen.findByText('Publicamos tu respuesta.');
    await user.click(screen.getByRole('link', { name: 'Volver a las reseñas' }));

    expect(await screen.findByRole('button', { name: '2 sin responder' })).toBeInTheDocument();
  });
});

describe('paginación', () => {
  it('pasa de página y lo refleja en la URL', async () => {
    const muchas = Array.from({ length: 25 }, (_, index) => ({
      ...mockReviews[0]!,
      urn: `urn:review:n${String(index)}`,
      comment: `Reseña número ${String(index)}`,
    }));
    givenMock.reviews(muchas);

    const { user, router } = renderApp([LISTA]);

    expect(await screen.findByText('Mostrando 1–20 de 25')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    await waitFor(() => {
      expect(router.state.location.search).toContain('page=2');
    });
    expect(await screen.findByText('Mostrando 21–25 de 25')).toBeInTheDocument();
  });
});

describe('responder', () => {
  it('publica una respuesta nueva', async () => {
    const { user } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias por pasar, Ana.');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));

    expect(await screen.findByText('Publicamos tu respuesta.')).toBeInTheDocument();
    // El foco va al mensaje, no se pierde en `body`.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveFocus();
    });
    // Y la pantalla ya la trata como publicada: se edita, con su fecha. No se repite en la tarjeta.
    expect(await screen.findByRole('heading', { name: 'Editar tu respuesta' })).toBeInTheDocument();
    expect(screen.getByText(/^Publicada el /)).toBeInTheDocument();
    expect(screen.queryByText(/Tu respuesta/)).not.toBeInTheDocument();
  });

  it('la misma pantalla edita la respuesta existente', async () => {
    const { user } = renderApp([detalle('urn:review:bbbb2222')]);

    const textarea = await screen.findByLabelText('Texto de la respuesta');
    expect(textarea).toHaveValue('Rodrigo, lamentamos la demora. Sumamos una persona en barra.');
    expect(screen.getByRole('heading', { name: 'Editar tu respuesta' })).toBeInTheDocument();

    await user.clear(textarea);
    await user.type(textarea, 'Rodrigo, ya sumamos gente los fines de semana.');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Publicamos tu respuesta.')).toBeInTheDocument();
  });

  it('no deja publicar una respuesta vacía ni de solo espacios', async () => {
    const { user } = renderApp([detalle('urn:review:aaaa1111')]);

    const boton = await screen.findByRole('button', { name: 'Publicar respuesta' });
    expect(boton).toBeDisabled();

    await user.type(screen.getByLabelText('Texto de la respuesta'), '   ');
    expect(boton).toBeDisabled();
  });

  describe('respuesta sugerida', () => {
    it('llena el texto para revisarlo, sin publicar', async () => {
      const { user } = renderApp([detalle('urn:review:aaaa1111')]);

      await user.click(await screen.findByRole('button', { name: 'Usar respuesta sugerida' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue(
          '¡Gracias, Ana! Nos alegra un montón que la hayas pasado bien. Te esperamos pronto.',
        );
      });
      expect(screen.getByText('Pusimos una sugerencia: revisala antes de publicar.')).toBeInTheDocument();
      expect(screen.queryByText('Publicamos tu respuesta.')).not.toBeInTheDocument();
    });

    it('no se ofrece al editar una respuesta ya publicada', async () => {
      renderApp([detalle('urn:review:bbbb2222')]);

      await screen.findByRole('heading', { name: 'Editar tu respuesta' });
      // El resumen llega aparte: se espera a que haya respondido antes de afirmar que no está.
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Usar respuesta sugerida' })).not.toBeInTheDocument();
      });
    });

    it('sin sugerencias en el servidor no ofrece el botón', async () => {
      givenMock.replySuggestions('unavailable');
      renderApp([detalle('urn:review:aaaa1111')]);

      await screen.findByLabelText('Texto de la respuesta');
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Usar respuesta sugerida' })).not.toBeInTheDocument();
      });
    });

    it('si falla, lo dice y deja escribir', async () => {
      givenMock.replySuggestions('failed');
      const { user } = renderApp([detalle('urn:review:aaaa1111')]);

      await user.click(await screen.findByRole('button', { name: 'Usar respuesta sugerida' }));

      expect(await screen.findByText(/No pudimos sugerir una respuesta/)).toBeInTheDocument();
      expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue('');
    });
  });

  describe('borrar con "Deshacer" en vez de confirmación', () => {
    const deleteCalls = () => {
      const calls: string[] = [];
      server.events.on('request:start', ({ request }) => {
        if (request.method === 'DELETE') calls.push(request.url);
      });
      return calls;
    };

    beforeEach(() => {
      // Con tiempo real además: los delays de user-event siguen andando.
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
      server.events.removeAllListeners();
    });

    it('la respuesta desaparece en el acto y se borra en Google al cerrarse el aviso', async () => {
      const calls = deleteCalls();
      const { user } = renderApp([detalle('urn:review:bbbb2222')]);

      await user.click(await screen.findByRole('button', { name: 'Borrar respuesta' }));

      expect(screen.getByText('Borramos la respuesta: deja de verse en Google.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Responder' })).toBeInTheDocument();
      expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue('');
      expect(calls).toHaveLength(0);

      await act(() => vi.advanceTimersByTimeAsync(7000));

      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });
      expect(screen.queryByText(/Tu respuesta/)).not.toBeInTheDocument();
    });

    it('"Deshacer" deja la respuesta como estaba y no borra nada', async () => {
      const calls = deleteCalls();
      const { user } = renderApp([detalle('urn:review:bbbb2222')]);

      await user.click(await screen.findByRole('button', { name: 'Borrar respuesta' }));
      await user.click(screen.getByRole('button', { name: 'Deshacer' }));
      await act(() => vi.advanceTimersByTimeAsync(7000));

      expect(calls).toHaveLength(0);
      expect(screen.getByRole('heading', { name: 'Editar tu respuesta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue(
        'Rodrigo, lamentamos la demora. Sumamos una persona en barra.',
      );
    });
  });

  it('muestra el mensaje del errorCode si el backend rechaza la respuesta', async () => {
    server.use(
      http.put(`${API_BASE_URL}/businesses/:b/locations/:l/reviews/:r/reply`, () =>
        HttpResponse.json(apiErrorBody(400, 'GOOGLE_RATE_LIMITED'), { status: 400 }),
      ),
    );

    const { user } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias!');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Google está limitando los pedidos.');
    // Límite de Google: reintentar más tarde sí sirve, así que no se ofrece reconectar.
    expect(screen.queryByRole('link', { name: 'Reconectar' })).not.toBeInTheDocument();
    // Y lo escrito no se pierde.
    expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue('Gracias!');
  });

  /** Cuenta los pedidos del estado de la conexión (para ver que se revalida). */
  function countConnectionChecks() {
    const counter = { calls: 0 };
    server.use(
      http.get(`${API_BASE_URL}/businesses/:b/google/connection`, () => {
        counter.calls += 1;
        return HttpResponse.json({
          urn: 'urn:google-connection:1',
          status: 'ACTIVE',
          scopes: [],
          connectedAt: '2026-06-15T00:00:00.000Z',
          connectedByUserUrn: 'urn:user:1',
        });
      }),
    );
    return counter;
  }

  it('si se revocó el acceso a Google, ofrece reconectar y revalida la conexión', async () => {
    const checks = countConnectionChecks();
    server.use(
      http.put(`${API_BASE_URL}/businesses/:b/locations/:l/reviews/:r/reply`, () =>
        HttpResponse.json(apiErrorBody(403, 'GOOGLE_CONNECTION_REVOKED'), { status: 403 }),
      ),
    );
    const { user } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias!');
    await waitFor(() => {
      expect(checks.calls).toBeGreaterThan(0);
    });
    const before = checks.calls;
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));

    expect(await screen.findByRole('link', { name: 'Reconectar' })).toHaveAttribute('href', '/settings/google');
    expect(screen.getByText('Se revocó el acceso a Google. Hay que volver a conectar la cuenta.')).toBeInTheDocument();
    await waitFor(() => {
      expect(checks.calls).toBeGreaterThan(before);
    });
  });

  it('también al borrar una respuesta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.delete(`${API_BASE_URL}/businesses/:b/locations/:l/reviews/:r/reply`, () =>
        HttpResponse.json(apiErrorBody(403, 'GOOGLE_CONNECTION_REVOKED'), { status: 403 }),
      ),
    );
    const { user } = renderApp([detalle('urn:review:bbbb2222')]);

    await user.click(await screen.findByRole('button', { name: 'Borrar respuesta' }));
    await act(() => vi.advanceTimersByTimeAsync(7000));

    expect(await screen.findByRole('link', { name: 'Reconectar' })).toHaveAttribute('href', '/settings/google');
    // Si no se pudo borrar, la respuesta vuelve al formulario.
    expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue(
      'Rodrigo, lamentamos la demora. Sumamos una persona en barra.',
    );
    vi.useRealTimers();
  });
});

describe('detalle: título y nombres accesibles', () => {
  it('tiene un título visible con quién dejó la reseña, y el formulario debajo en la jerarquía', async () => {
    renderApp([detalle('urn:review:aaaa1111')]);

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Reseña de Ana Pérez' });
    expect(h1).not.toHaveClass('sr-only');
    expect(screen.getByRole('heading', { level: 2, name: 'Responder' })).toBeInTheDocument();
  });

  it('una reseña anónima se titula sin nombre', async () => {
    renderApp([detalle('urn:review:cccc3333')]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Reseña anónima' })).toBeInTheDocument();
  });

  it('con respuesta, no la muestra dos veces: queda en el formulario, con su fecha', async () => {
    renderApp([detalle('urn:review:bbbb2222')]);

    const textarea = await screen.findByLabelText('Texto de la respuesta');
    expect(textarea).toHaveValue('Rodrigo, lamentamos la demora. Sumamos una persona en barra.');
    // Fuera del campo de texto (donde sí tiene que estar), no aparece.
    expect(
      screen.queryByText('Rodrigo, lamentamos la demora. Sumamos una persona en barra.', { ignore: 'textarea' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/^Publicada el /)).toBeInTheDocument();
  });

  it('en el listado, cada acción dice de qué reseña es (y contiene el texto visible)', async () => {
    renderApp([LISTA]);

    expect(await screen.findByRole('link', { name: 'Responder a Ana Pérez' })).toHaveTextContent('Responder');
    expect(screen.getByRole('link', { name: 'Ver reseña de Rodrigo Blanco' })).toHaveTextContent('Ver reseña');
    expect(screen.getByRole('link', { name: /^Responder la reseña anónima del / })).toBeInTheDocument();
  });

  it('"Ver en Google" avisa que abre otra pestaña', async () => {
    renderApp([LISTA]);

    const google = await screen.findByRole('link', {
      name: 'Ver en Google la reseña de Ana Pérez, se abre en otra pestaña',
    });
    expect(google).toHaveAttribute('target', '_blank');
  });
});

describe('paginación con una sola página', () => {
  it('muestra el conteo sin botones que no hacen nada', async () => {
    renderApp([LISTA]);

    expect(await screen.findByText('Mostrando 1–4 de 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument();
  });
});

describe('después de publicar', () => {
  it('ofrece volver al listado como se dejó (filtros incluidos)', async () => {
    // La sucursal ya va en la URL: si no, el listado la completa con un `replace` y el clic podía
    // caer en el render anterior (una carrera del test, no de la app).
    const { user, router } = renderApp([
      `${LISTA}?replied=no&location=${encodeURIComponent(mockImportedLocation.urn)}`,
    ]);

    await screen.findByText('3 sin responder');
    const listUrl = `${router.state.location.pathname}${router.state.location.search}`;
    await user.click(screen.getAllByRole('link', { name: /^Responder (a |la reseña)/ })[0]!);
    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias por pasar.');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));

    const back = await screen.findByRole('link', { name: 'Volver al listado' });
    expect(back).toHaveAttribute('href', listUrl);
    // Dentro del mensaje, que es donde queda el foco.
    expect(screen.getByRole('status')).toContainElement(back);
  });
});

describe('borradores', () => {
  const DRAFT_KEY = 'opinara.reply-draft:urn:review:aaaa1111';

  it('lo escrito sin publicar vuelve al regresar a la reseña', async () => {
    const { user, router } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Borrador a medias');
    await user.click(screen.getByRole('link', { name: 'Volver a las reseñas' }));
    await screen.findByRole('heading', { name: 'Reseñas' });
    await router.navigate(detalle('urn:review:aaaa1111'));

    expect(await screen.findByLabelText('Texto de la respuesta')).toHaveValue('Borrador a medias');
    expect(screen.getByText('Recuperamos lo que habías escrito y no publicaste.')).toBeInTheDocument();
  });

  it('cada reseña tiene el suyo: no se pisan', async () => {
    const { user, router } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Para Ana');
    await router.navigate(detalle('urn:review:cccc3333'));

    await waitFor(() => {
      expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue('');
    });
    await user.type(screen.getByLabelText('Texto de la respuesta'), 'Para la anónima');
    await router.navigate(detalle('urn:review:aaaa1111'));

    await waitFor(() => {
      expect(screen.getByLabelText('Texto de la respuesta')).toHaveValue('Para Ana');
    });
    expect(sessionStorage.getItem('opinara.reply-draft:urn:review:cccc3333')).toBe('Para la anónima');
  });

  it('si publicar falla, el borrador no se borra', async () => {
    server.use(
      http.put(`${API_BASE_URL}/businesses/:b/locations/:l/reviews/:r/reply`, () =>
        HttpResponse.json(apiErrorBody(400, 'GOOGLE_RATE_LIMITED'), { status: 400 }),
      ),
    );
    const { user } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'No llegó a salir');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));
    await screen.findByText(/Google está limitando los pedidos/);

    expect(sessionStorage.getItem(DRAFT_KEY)).toBe('No llegó a salir');
  });

  it('se borra solo después de publicar bien', async () => {
    const { user, router } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.type(await screen.findByLabelText('Texto de la respuesta'), 'Gracias, Ana');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe('Gracias, Ana');
    await user.click(screen.getByRole('button', { name: 'Publicar respuesta' }));
    await screen.findByText('Publicamos tu respuesta.');

    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    await router.navigate(LISTA);
    await screen.findByRole('heading', { name: 'Reseñas' });
    await router.navigate(detalle('urn:review:aaaa1111'));
    await screen.findByLabelText('Texto de la respuesta');
    expect(screen.queryByText('Recuperamos lo que habías escrito y no publicaste.')).not.toBeInTheDocument();
  });
});

describe('detalle', () => {
  it('"Volver" conserva los filtros y la página con los que se abrió la reseña', async () => {
    givenMock.reviews(
      Array.from({ length: 25 }, (_, index) => ({ ...mockReviews[0]!, urn: `urn:review:p${String(index)}` })),
    );
    const { user, router } = renderApp([`${LISTA}?replied=no`]);

    await user.click(await screen.findByRole('button', { name: /siguiente/i }));
    await screen.findByText('Mostrando 21–25 de 25');
    const listUrl = router.state.location.search;
    expect(listUrl).toContain('replied=no');
    expect(listUrl).toContain('page=2');

    await user.click(screen.getAllByRole('link', { name: /^Responder (a |la reseña)/ })[0]!);
    await user.click(await screen.findByRole('link', { name: 'Volver a las reseñas' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
    expect(router.state.location.search).toBe(listUrl);
  });

  it('vuelve al listado', async () => {
    const { user, router } = renderApp([detalle('urn:review:aaaa1111')]);

    await user.click(await screen.findByRole('link', { name: 'Volver a las reseñas' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
  });

  it('muestra el mensaje propio si la reseña no existe', async () => {
    renderApp([detalle('urn:review:no-existe')]);

    expect(await within(await screen.findByRole('alert')).findByText('No encontramos la reseña.')).toBeInTheDocument();
  });
});
