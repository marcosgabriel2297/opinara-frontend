import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL, session } from '@/lib/http';
import { apiErrorBody, mockSession, mockUser } from '@/mocks/fixtures';
import { TEMPORARY_PASSWORD } from '@/mocks/handlers/auth';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';

const PASSWORD = 'claveSuperSegura1';

beforeEach(() => {
  session.clear();
});

/** Deja el refresh token en localStorage, como si la pestaña se hubiera recargado. */
function withPersistedSession() {
  session.set({ accessToken: 'el-de-antes', refreshToken: mockSession.refreshToken });
  // El access token no sobrevive a un reload: solo queda el refresh.
  session.set({ accessToken: '', refreshToken: mockSession.refreshToken });
}

describe('guard de rutas privadas', () => {
  it('manda al login a quien no tiene sesión', async () => {
    const { router } = renderApp(['/reviews']);

    expect(await screen.findByRole('heading', { name: 'Entrá a tu cuenta' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('después de entrar lo devuelve a donde quería ir', async () => {
    const { user, router } = renderApp(['/campaigns']);

    await user.type(await screen.findByLabelText('Email'), mockUser.email);
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/campaigns');
    });
  });

  it('no deja que el destino guardado sea una URL externa', async () => {
    const { user, router } = renderApp([{ pathname: '/login', state: { from: '//evil.example' } }]);

    await user.type(await screen.findByLabelText('Email'), mockUser.email);
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('a quien ya tiene sesión no le muestra el login', async () => {
    withPersistedSession();
    const { router } = renderApp(['/login']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });
});

describe('sesión persistida', () => {
  it('reanuda la sesión con un solo POST /auth/refresh al abrir la app', async () => {
    withPersistedSession();

    let refreshes = 0;
    let meCalls = 0;
    server.use(
      http.post(`${API_BASE_URL}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json(mockSession);
      }),
      http.get(`${API_BASE_URL}/auth/me`, () => {
        meCalls += 1;
        return HttpResponse.json(mockUser);
      }),
    );

    const { router } = renderApp(['/reviews']);

    expect(await screen.findByRole('heading', { name: 'Reseñas' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/reviews');
    expect(refreshes).toBe(1);
    expect(meCalls).toBe(0);
  });

  it('si el refresh guardado ya no sirve, manda al login y borra el token', async () => {
    session.set({ accessToken: '', refreshToken: 'refresh-vencido' });

    const { router } = renderApp(['/reviews']);

    expect(await screen.findByRole('heading', { name: 'Entrá a tu cuenta' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(session.getRefreshToken()).toBeNull();
  });

  it('con la cuenta desactivada explica por qué, en vez de decir que la sesión venció', async () => {
    session.set({ accessToken: '', refreshToken: mockSession.refreshToken });
    server.use(
      http.post(`${API_BASE_URL}/auth/refresh`, () =>
        HttpResponse.json(apiErrorBody(403, 'USER_INACTIVE', '/api/auth/refresh'), { status: 403 }),
      ),
    );

    renderApp(['/reviews']);

    expect(await screen.findByText(/cuenta está desactivada/i)).toBeInTheDocument();
  });

  it('sin nada guardado no le pega a la red', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/refresh`, () => {
        throw new Error('no debería refrescar sin token guardado');
      }),
    );

    renderApp(['/login']);

    expect(await screen.findByRole('heading', { name: 'Entrá a tu cuenta' })).toBeInTheDocument();
  });
});

describe('login', () => {
  it('muestra el mensaje del errorCode cuando las credenciales están mal', async () => {
    const { user, router } = renderApp(['/login']);

    await user.type(await screen.findByLabelText('Email'), mockUser.email);
    await user.type(screen.getByLabelText('Contraseña'), 'contraseñaIncorrecta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
    expect(router.state.location.pathname).toBe('/login');
    expect(session.getRefreshToken()).toBeNull();
  });

  it('valida en el cliente antes de gastar un request', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () => {
        calls += 1;
        return HttpResponse.json(mockSession);
      }),
    );

    const { user } = renderApp(['/login']);

    await user.type(await screen.findByLabelText('Email'), 'no-es-un-email');
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Ese email no parece válido.')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('guarda el refresh token y deja el access solo en memoria', async () => {
    const { user } = renderApp(['/login']);

    await user.type(await screen.findByLabelText('Email'), mockUser.email);
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(session.getAccessToken()).toBe(mockSession.accessToken);
    });
    expect(localStorage.getItem('opinara.refresh-token')).toBe(mockSession.refreshToken);
    expect(JSON.stringify(localStorage)).not.toContain(mockSession.accessToken);
  });
});

describe('sin registro público', () => {
  it('el login no ofrece crear cuenta: la crea un administrador', async () => {
    renderApp(['/login']);

    expect(await screen.findByText(/te la crea un administrador/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /creá una/i })).not.toBeInTheDocument();
  });

  it('/sign-up ya no existe: lleva al login', async () => {
    const { router } = renderApp(['/sign-up']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });
});

describe('primer ingreso con la contraseña provisoria', () => {
  async function loginWithTemporary(initial: string) {
    const rendered = renderApp([initial]);
    await rendered.user.type(await screen.findByLabelText('Email'), 'nuevo@opinara.test');
    await rendered.user.type(screen.getByLabelText('Contraseña'), TEMPORARY_PASSWORD);
    await rendered.user.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('heading', { name: 'Elegí tu contraseña' });
    return rendered;
  }

  it('obliga a cambiarla antes de entrar, y después sigue a donde quería ir', async () => {
    const { user, router } = await loginWithTemporary('/campaigns');
    expect(router.state.location.pathname).toBe('/change-password');

    // Mientras no la cambie, cualquier ruta privada vuelve acá.
    await router.navigate('/reviews');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/change-password');
    });

    await user.type(screen.getByLabelText('Contraseña provisoria'), TEMPORARY_PASSWORD);
    await user.type(screen.getByLabelText('Contraseña nueva'), 'miClaveNueva1');
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), 'miClaveNueva1');
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/reviews');
    });
  });

  it('valida que coincidan, que cambie y los 8 caracteres antes de mandar', async () => {
    const { user } = await loginWithTemporary('/');

    await user.type(screen.getByLabelText('Contraseña provisoria'), TEMPORARY_PASSWORD);
    await user.type(screen.getByLabelText('Contraseña nueva'), 'corta');
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), 'otra');
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));

    expect(await screen.findByText('La contraseña necesita al menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Contraseña nueva'));
    await user.type(screen.getByLabelText('Contraseña nueva'), TEMPORARY_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));

    expect(await screen.findByText('Elegí una distinta de la provisoria.')).toBeInTheDocument();
  });

  it('avisa si la provisoria no es correcta', async () => {
    const { user, router } = await loginWithTemporary('/');

    await user.type(screen.getByLabelText('Contraseña provisoria'), 'noEsLaProvisoria');
    await user.type(screen.getByLabelText('Contraseña nueva'), 'miClaveNueva1');
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), 'miClaveNueva1');
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña provisoria no es correcta.');
    expect(router.state.location.pathname).toBe('/change-password');
  });

  it('quien ya eligió su contraseña no ve esta pantalla', async () => {
    withPersistedSession();
    const { router } = renderApp(['/change-password']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });
});

describe('cerrar sesión', () => {
  it('borra la sesión local y vuelve al login', async () => {
    withPersistedSession();
    const { user, router } = renderApp(['/reviews']);

    await user.click(await screen.findByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(session.getRefreshToken()).toBeNull();
    // Cerrar sesión a mano no es lo mismo que una sesión vencida: no le mostramos ese aviso.
    expect(screen.queryByText(/sesión venció/i)).not.toBeInTheDocument();
  });
});

describe('sesión que vence en medio del uso', () => {
  it('expulsa al login y explica qué pasó', async () => {
    withPersistedSession();
    const { router } = renderApp(['/reviews']);

    await screen.findByRole('heading', { name: 'Reseñas' });

    // El cliente HTTP limpia el store cuando un refresh falla; acá simulamos ese efecto.
    session.clear();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(await screen.findByText(/sesión venció/i)).toBeInTheDocument();
  });
});
