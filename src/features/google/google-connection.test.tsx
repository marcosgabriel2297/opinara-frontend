import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { http, HttpResponse } from 'msw';

import { browser } from '@/lib/browser';
import { API_BASE_URL, session } from '@/lib/http';
import { apiErrorBody, mockBusiness } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  sessionStorage.clear();
});

describe('aviso de conexión', () => {
  it('avisa de forma prominente cuando se revocó el acceso', async () => {
    givenMock.connection('REVOKED');
    renderApp(['/reviews']);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Se cortó la conexión con Google');
    // Sin botón de cerrar: mientras esté así no entran reseñas nuevas.
    expect(within(alert).queryByRole('button', { name: /cerrar/i })).not.toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Reconectar' })).toHaveAttribute('href', '/settings/google');
  });

  it('avisa cuando todavía no conectó Google', async () => {
    givenMock.connection(null);
    renderApp(['/reviews']);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falta conectar Google');
  });

  it('no repite el aviso adentro de las pantallas de Google', async () => {
    givenMock.connection('REVOKED');
    renderApp(['/settings/google']);

    await screen.findByRole('heading', { name: 'Conexión con Google' });
    expect(screen.queryByText('Se cortó la conexión con Google')).not.toBeInTheDocument();
  });

  it('no molesta cuando la conexión está sana', async () => {
    renderApp(['/reviews']);

    await screen.findByRole('heading', { name: 'Reseñas' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('estado de la conexión', () => {
  it('muestra que está conectada y desde cuándo', async () => {
    renderApp(['/settings/google']);

    expect(await screen.findByText('Conectada')).toBeInTheDocument();
    expect(screen.getByText('todavía no sincronizaste')).toBeInTheDocument();
  });

  it('a quien no es dueño le explica que no puede conectar', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    givenMock.connection(null);
    renderApp(['/settings/google']);

    expect(
      await screen.findByText('Solo el dueño del negocio puede conectar la cuenta de Google.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar con Google' })).not.toBeInTheDocument();
  });

  it('manda el browser a Google al conectar, y recuerda de qué negocio se trata', async () => {
    givenMock.connection(null);

    const redirectTo = vi.spyOn(browser, 'redirectTo').mockImplementation(() => undefined);

    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Conectar con Google' }));

    await waitFor(() => {
      expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('/settings/google/callback'));
    });
    expect(sessionStorage.getItem('opinara.google-connecting')).toBe(mockBusiness.urn);
  });

  it('desconecta con confirmación previa', async () => {
    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Desconectar' }));
    expect(screen.getByText(/Dejamos de traer reseñas nuevas/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desconectar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Desconectamos tu cuenta de Google.');
    expect(screen.getByRole('button', { name: 'Conectar con Google' })).toBeInTheDocument();
  });
});

describe('estado de la conexión: una tarjeta por estado, sin adivinar', () => {
  it('mientras carga no ofrece conectar ni marca pasos', async () => {
    let release: (() => void) | undefined;
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/google/connection`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(apiErrorBody(404, 'GOOGLE_CONNECTION_NOT_FOUND'), { status: 404 });
      }),
    );
    renderApp(['/settings/google']);

    expect(await screen.findByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('Conectá tu Google Business Profile')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Paso/ })).not.toBeInTheDocument();
    release?.();
    // Al llegar la respuesta, recién ahí se muestra el estado real.
    expect(await screen.findByText('Conectá tu Google Business Profile')).toBeInTheDocument();
  });

  it('si la consulta falla, muestra el error y no el flujo de primera conexión', async () => {
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/google/connection`, () =>
        HttpResponse.json(apiErrorBody(400, 'VALIDATION_ERROR'), { status: 400 }),
      ),
    );
    renderApp(['/settings/google']);

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Conectá tu Google Business Profile')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar con Google' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Paso/ })).not.toBeInTheDocument();
  });

  it('sin conexión, una sola tarjeta: qué se va a pedir y el botón', async () => {
    givenMock.connection(null);
    renderApp(['/settings/google']);

    expect(await screen.findByText('Conectá tu Google Business Profile')).toBeInTheDocument();
    expect(screen.queryByText('Estado de la conexión')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Conectar con Google' })).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Paso 1 de 3' })).toBeInTheDocument();
  });

  it('revocada: dice qué pasó, no repite el texto de la primera conexión', async () => {
    givenMock.connection('REVOKED');
    renderApp(['/settings/google']);

    expect(await screen.findByText(/Google dejó de darnos acceso/)).toBeInTheDocument();
    expect(screen.getByText('Hay que reconectar')).toBeInTheDocument();
    expect(screen.queryByText(/Vamos a pedirte permiso/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconectar' })).toBeInTheDocument();
  });
});

describe('foco en conectar y desconectar', () => {
  it('abrir la confirmación lleva el foco a ella; cancelar lo devuelve a "Desconectar"', async () => {
    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Desconectar' }));
    const confirm = screen.getByRole('group', { name: /Dejamos de traer reseñas nuevas/ });
    expect(within(confirm).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Desconectar' })).toHaveFocus();
  });

  it('con teclado: Enter abre la confirmación y Enter en Cancelar vuelve al botón', async () => {
    const { user } = renderApp(['/settings/google']);

    (await screen.findByRole('button', { name: 'Desconectar' })).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Desconectar' })).toHaveFocus();
  });

  it('si desconectar falla, el foco va al error', async () => {
    server.use(
      http.delete(`${API_BASE_URL}/businesses/:businessUrn/google/connection`, () =>
        HttpResponse.json(apiErrorBody(502, 'GOOGLE_UNAVAILABLE'), { status: 502 }),
      ),
    );
    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Desconectar' }));
    await user.click(within(screen.getByRole('group')).getByRole('button', { name: 'Desconectar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveFocus();
    });
  });

  it('al desconectar, el foco va al aviso del resultado', async () => {
    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Desconectar' }));
    await user.click(within(screen.getByRole('group')).getByRole('button', { name: 'Desconectar' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveFocus();
    });
  });

  it('si conectar falla, el foco va al error', async () => {
    givenMock.connection(null);
    server.use(
      http.post(`${API_BASE_URL}/businesses/:businessUrn/google/connect`, () =>
        HttpResponse.json(apiErrorBody(403, 'FORBIDDEN'), { status: 403 }),
      ),
    );
    const { user } = renderApp(['/settings/google']);

    await user.click(await screen.findByRole('button', { name: 'Conectar con Google' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveFocus();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso para hacer esto.');
  });
});

describe('vuelta del callback de Google', () => {
  it('si Google vuelve sin el permiso, lo dice sin asumir que se canceló', async () => {
    renderApp(['/settings/google/callback?error=GOOGLE_PERMISSION_DENIED']);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Google no completó el permiso.');
    expect(alert).toHaveTextContent('Si cancelaste la autorización o no aceptaste los permisos');
    expect(alert).not.toHaveTextContent('Google no autoriza el acceso a ese recurso.');
  });

  it('los demás códigos del callback conservan su mensaje', async () => {
    renderApp(['/settings/google/callback?error=GOOGLE_INVALID_OAUTH_STATE']);

    expect(await screen.findByRole('alert')).toHaveTextContent('El pedido de autorización venció.');
  });

  it('confirma la conexión y ofrece seguir con las cuentas', async () => {
    renderApp(['/settings/google/callback']);

    expect(await screen.findByText('Listo, conectamos tu cuenta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/settings/google/accounts');
  });

  it('vuelve parado en el negocio que estaba conectando, no en el seleccionado', async () => {
    const otro = { ...mockBusiness, urn: 'urn:business:otro', name: 'Peluquería', slug: 'peluqueria' };
    givenMock.businesses([mockBusiness, otro]);
    sessionStorage.setItem('opinara.google-connecting', otro.urn);

    renderApp(['/settings/google/callback']);

    await waitFor(() => {
      expect(localStorage.getItem('opinara.business')).toBe(otro.urn);
    });
    // El dato es de un solo viaje: no queda para la próxima.
    expect(sessionStorage.getItem('opinara.google-connecting')).toBeNull();
  });
});

describe('elegir cuenta e importar sucursales', () => {
  it('lista las cuentas y lleva a las sucursales de la elegida', async () => {
    const { user, router } = renderApp(['/settings/google/accounts']);

    // La cuenta de Google (el nombre del negocio también está en la barra de arriba).
    expect(await screen.findByText('accounts/1234567890')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar esta cuenta' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/settings/google/locations');
    });
    expect(router.state.location.search).toContain('account=accounts%2F1234567890');
  });

  it('si la conexión se revocó, ofrece reconectar en vez de reintentar', async () => {
    givenMock.connection('REVOKED');
    renderApp(['/settings/google/accounts']);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Se revocó el acceso a Google. Hay que volver a conectar la cuenta.');
    // Reintentar el mismo request falla igual: lo que hace falta es rehacer la conexión.
    expect(within(alert).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Reconectar' })).toHaveAttribute('href', '/settings/google');
  });

  it('marca las ya importadas y no deja volver a elegirlas', async () => {
    renderApp(['/settings/google/locations?account=accounts/1234567890']);

    const yaImportada = await screen.findByLabelText('Café de la Esquina — Centro');
    expect(yaImportada).toBeDisabled();
    expect(screen.getByText('Ya importada')).toBeInTheDocument();
  });

  it('avisa cuál sucursal no sirve para una campaña de QR, y por qué, en texto visible', async () => {
    renderApp(['/settings/google/locations?account=accounts/1234567890']);

    const badge = await screen.findByText('Sin link de reseñas en Google');
    expect(badge).not.toHaveAttribute('title');
    expect(screen.getByText(/No vas a poder usarla en una campaña de QR/)).toBeVisible();
  });

  it('importa las seleccionadas y lo confirma', async () => {
    const { user } = renderApp(['/settings/google/locations?account=accounts/1234567890']);

    await user.click(await screen.findByLabelText('Café de la Esquina — Palermo'));
    await user.click(screen.getByRole('button', { name: 'Importar seleccionadas' }));

    expect(await screen.findByText('Importamos 1 sucursal.')).toBeInTheDocument();
    // Y la lista se refresca: ahora figura como importada.
    await waitFor(() => {
      expect(screen.getAllByText('Ya importada')).toHaveLength(2);
    });
  });

  it('después de importar: foco en el aviso, salida clara y los pasos completos', async () => {
    const { user } = renderApp(['/settings/google/locations?account=accounts/1234567890']);

    await user.click(await screen.findByLabelText('Café de la Esquina — Palermo'));
    await user.click(screen.getByRole('button', { name: 'Importar seleccionadas' }));

    const status = await screen.findByRole('status');
    await waitFor(() => {
      expect(status).toHaveFocus();
    });
    expect(within(status).getByRole('link', { name: 'Ver mis reseñas' })).toHaveAttribute('href', '/reviews');
    expect(within(status).getByRole('link', { name: 'Volver a Conexión con Google' })).toHaveAttribute(
      'href',
      '/settings/google',
    );
    expect(screen.getByRole('list', { name: 'Los tres pasos están hechos' })).toBeInTheDocument();
  });

  it('si importar falla, el foco va al error y se puede reintentar', async () => {
    server.use(
      http.post(`${API_BASE_URL}/businesses/:businessUrn/google/locations/import`, () =>
        HttpResponse.json(apiErrorBody(503, 'GOOGLE_UNAVAILABLE'), { status: 503 }),
      ),
    );
    const { user } = renderApp(['/settings/google/locations?account=accounts/1234567890']);

    await user.click(await screen.findByLabelText('Café de la Esquina — Palermo'));
    await user.click(screen.getByRole('button', { name: 'Importar seleccionadas' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveFocus();
    });
    // La selección queda: se puede volver a intentar sin elegir de nuevo.
    expect(screen.getByLabelText('Café de la Esquina — Palermo')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Importar seleccionadas' })).toBeEnabled();
  });

  it('no deja importar sin elegir nada', async () => {
    givenMock.noImportedLocations();
    renderApp(['/settings/google/locations?account=accounts/1234567890']);

    expect(await screen.findByRole('button', { name: 'Importar seleccionadas' })).toBeDisabled();
    expect(screen.getByText('Elegí al menos una sucursal.')).toBeInTheDocument();
  });
});

describe('progreso de la conexión', () => {
  it('con sucursales importadas marca los tres pasos como hechos y ninguno en curso', async () => {
    renderApp(['/settings/google']);

    expect(await screen.findByText('Tenés 1 sucursal importada.')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Los tres pasos están hechos' });
    for (const item of within(steps).getAllByRole('listitem')) {
      expect(item).not.toHaveAttribute('aria-current');
      // El tilde es visual: el "hecho" también está en texto.
      expect(item).toHaveTextContent('(hecho)');
    }
  });

  it('conectada pero sin sucursales, el paso en curso es elegir la cuenta', async () => {
    givenMock.noImportedLocations();
    renderApp(['/settings/google']);

    const steps = await screen.findByRole('list', { name: 'Paso 2 de 3' });
    const current = within(steps)
      .getAllByRole('listitem')
      .filter((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Elegir la cuenta');
    expect(within(steps).getAllByRole('listitem')[0]).toHaveTextContent('Conectar tu cuenta (hecho)');
  });
});

describe('importar sucursales según el rol', () => {
  it('el miembro no ve el link para importar en el hub', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp(['/settings/google']);

    expect(await screen.findByText('Tenés 1 sucursal importada.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Importar más sucursales/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis reseñas' })).toBeInTheDocument();
  });

  it('el miembro sin sucursales importadas recibe una explicación, no un link', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    givenMock.noImportedLocations();
    renderApp(['/settings/google']);

    expect(
      await screen.findByText('Solo el dueño o un administrador del negocio pueden importar sucursales.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Usar esta cuenta/ })).not.toBeInTheDocument();
  });

  it('el miembro que entra directo a la importación la ve en modo lectura', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp(['/settings/google/locations?account=accounts/1234567890']);

    expect(await screen.findByText('Café de la Esquina — Palermo')).toBeInTheDocument();
    expect(
      screen.getByText('Solo el dueño o un administrador del negocio pueden importar sucursales.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Importar seleccionadas' })).not.toBeInTheDocument();
  });

  it.each(['OWNER', 'ADMIN'] as const)('%s conserva la importación', async (role) => {
    givenMock.businesses([{ ...mockBusiness, role }]);
    renderApp(['/settings/google']);

    expect(await screen.findByRole('link', { name: /Importar más sucursales/ })).toHaveAttribute(
      'href',
      '/settings/google/accounts',
    );
  });

  it.each(['OWNER', 'ADMIN'] as const)('%s ve las casillas y el botón de importar', async (role) => {
    givenMock.businesses([{ ...mockBusiness, role }]);
    renderApp(['/settings/google/locations?account=accounts/1234567890']);

    expect(await screen.findByLabelText('Café de la Esquina — Palermo')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Importar seleccionadas' })).toBeInTheDocument();
  });
});

describe('tarjeta de Google en Configuración', () => {
  it('con la cuenta conectada no pide permiso: dice que está conectada', async () => {
    renderApp(['/settings']);

    expect(await screen.findByText('Conectada')).toBeInTheDocument();
    expect(screen.getByText(/Traemos tus reseñas de Google/)).toBeInTheDocument();
    expect(screen.queryByText(/Vamos a pedirte permiso/)).not.toBeInTheDocument();
  });

  it('con el acceso revocado ofrece reconectar, una sola vez', async () => {
    givenMock.connection('REVOKED');
    renderApp(['/settings']);

    expect(await screen.findByText('Hay que reconectar')).toBeInTheDocument();
    expect(screen.getByText(/Google dejó de darnos acceso/)).toBeInTheDocument();
    // El cartel global no se repite acá: la tarjeta ya dice lo mismo, con la misma acción.
    expect(screen.queryByText('Se cortó la conexión con Google')).not.toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Reconectar' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/settings/google');
  });

  it('sin conexión explica qué permiso se va a pedir, con un solo "Conectar ahora"', async () => {
    givenMock.connection(null);
    renderApp(['/settings']);

    expect(await screen.findByText('Desconectada')).toBeInTheDocument();
    expect(screen.getByText(/Vamos a pedirte permiso/)).toBeInTheDocument();
    expect(screen.queryByText('Falta conectar Google')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Conectar ahora/ })).toHaveLength(1);
  });

  it('conectada, la acción dice lo que hace: administrar la conexión', async () => {
    renderApp(['/settings']);

    expect(await screen.findByRole('link', { name: 'Administrar conexión' })).toHaveAttribute(
      'href',
      '/settings/google',
    );
  });

  it('si la consulta falla, lo dice en vez de quedar muda', async () => {
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/google/connection`, () =>
        HttpResponse.json(apiErrorBody(400, 'VALIDATION_ERROR'), { status: 400 }),
      ),
    );
    renderApp(['/settings']);

    expect(await screen.findByText(/No pudimos consultar el estado de la conexión/)).toBeInTheDocument();
    expect(screen.queryByText('Conectada')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Administrar conexión' })).toBeInTheDocument();
  });

  it('el cartel global sigue apareciendo en el resto de la app', async () => {
    givenMock.connection(null);
    renderApp(['/campaigns']);

    expect(await screen.findByText('Falta conectar Google')).toBeInTheDocument();
  });
});

describe('datos del negocio en Configuración', () => {
  it('etiqueta la zona horaria y presenta /r/{slug} como el comienzo de la dirección de los QR', async () => {
    renderApp(['/settings']);

    const term = await screen.findByText('Zona horaria');
    expect(term.tagName).toBe('DT');
    expect(screen.getByText('America/Argentina/Buenos Aires')).toBeInTheDocument();
    const address = screen.getByText('Dirección de tus QR').nextElementSibling;
    expect(address).toHaveTextContent('/r/cafe-de-la-esquina/campaña');
    // No es un link: `/r/{slug}` solo no abre ninguna página.
    expect(screen.queryByRole('link', { name: /\/r\// })).not.toBeInTheDocument();
  });
});
