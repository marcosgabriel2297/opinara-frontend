import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL, session } from '@/lib/http';
import { apiErrorBody, mockBusiness, mockCampaigns, mockImportedLocation, mockQrPngDataUrl } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { givenMock } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

import * as printSheet from './print-sheet';

// jsdom no tiene canvas: las descargas se simulan acá. Su geometría (margen, dpi, tamaño) la cubre
// `print-sheet.test.ts`, y la imagen real se verifica en el navegador.
vi.mock('./print-sheet', async (importOriginal) => {
  const original = await importOriginal<typeof printSheet>();
  return {
    ...original,
    renderQrPng: vi.fn(() => Promise.resolve(new Blob(['qr'], { type: 'image/png' }))),
    renderSheetPng: vi.fn(() => Promise.resolve(new Blob(['hoja'], { type: 'image/png' }))),
    downloadBlob: vi.fn(),
  };
});

const LISTA = '/campaigns';
const detalle = (campaignUrn: string) => `/campaigns/${encodeURIComponent(campaignUrn)}`;

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
});

describe('listado de campañas', () => {
  it('muestra los escaneos de cada campaña', async () => {
    renderApp([LISTA]);

    expect(await screen.findByRole('link', { name: 'Mostrador' })).toBeInTheDocument();
    expect(screen.getByText('Escaneos')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('no presenta las redirecciones a Google como otra métrica: el backend las cuenta con cada escaneo', async () => {
    renderApp([LISTA]);

    await screen.findByText('200');
    // `googleClicks` (41 en el mock) no se muestra, ni suelto ni como porcentaje.
    expect(screen.queryByText('41')).not.toBeInTheDocument();
    expect(screen.queryByText('Fueron a Google')).not.toBeInTheDocument();
    expect(screen.queryByText(/de los escaneos/)).not.toBeInTheDocument();
  });

  it('no muestra opiniones internas: ya no existen', async () => {
    renderApp([LISTA]);

    await screen.findByText('200');
    expect(screen.queryByText(/opiniones internas/i)).not.toBeInTheDocument();
  });

  it('una campaña sin escaneos muestra 0', async () => {
    givenMock.campaigns([{ ...mockCampaigns[0]!, stats: { scans: 0, googleClicks: 0 } }]);
    renderApp([LISTA]);

    await screen.findByRole('link', { name: 'Mostrador' });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('sin campañas invita a crear la primera', async () => {
    givenMock.campaigns([]);
    renderApp([LISTA]);

    expect(await screen.findByText('Todavía no tenés campañas')).toBeInTheDocument();
  });

  it('sin sucursales ofrece cargar una a mano o importarla de Google', async () => {
    givenMock.noImportedLocations();
    renderApp([LISTA]);

    expect(await screen.findByText('Primero sumá una sucursal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agregar sucursal' })).toHaveAttribute('href', '/settings/locations/new');
    expect(screen.getByRole('link', { name: 'Importar desde Google' })).toHaveAttribute('href', '/settings/google');
  });

  it('a un MEMBER sin sucursales no le ofrece acciones que no puede hacer', async () => {
    givenMock.noImportedLocations();
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp([LISTA]);

    expect(await screen.findByText('Primero sumá una sucursal')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Agregar sucursal' })).not.toBeInTheDocument();
  });

  it('a un MEMBER no le ofrece crear campañas', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp([LISTA]);

    await screen.findByRole('heading', { name: 'Campañas y QR' });
    expect(screen.queryByRole('button', { name: 'Crear campaña' })).not.toBeInTheDocument();
  });

  it('si la sucursal de una campaña ya no existe, lo dice en vez de mostrar el URN', async () => {
    givenMock.campaigns([{ ...mockCampaigns[0]!, locationUrn: 'urn:location:borrada' }]);
    renderApp([LISTA]);

    expect(await screen.findByText('Sucursal no encontrada')).toBeInTheDocument();
    expect(screen.queryByText('urn:location:borrada')).not.toBeInTheDocument();
  });

  it('a un MEMBER sin campañas no le pide que cree una', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    givenMock.campaigns([]);
    renderApp([LISTA]);

    expect(
      await screen.findByText('Cuando el dueño o un administrador cree una, va a aparecer acá.'),
    ).toBeInTheDocument();
  });
});

describe('crear campaña', () => {
  it('crea la campaña y va derecho al QR', async () => {
    const { user, router } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));
    await user.type(screen.getByLabelText('Nombre de la campaña'), 'Mesas');
    await user.click(screen.getByRole('button', { name: 'Crear campaña' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/campaigns/urn%3Acampaign%3Amesas');
    });
  });

  it('muestra la vista previa del link mientras escribe', async () => {
    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));
    await user.type(screen.getByLabelText('Nombre de la campaña'), 'Mesas de afuera');

    expect(await screen.findByText('/r/cafe-de-la-esquina/mesas-de-afuera')).toBeInTheDocument();
  });

  it('si el identificador ya existe, lo marca en su campo, con el foco ahí y qué hacer', async () => {
    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));
    await user.type(screen.getByLabelText('Nombre de la campaña'), 'Mostrador');
    await user.click(screen.getByRole('button', { name: 'Crear campaña' }));

    const slug = screen.getByLabelText('Identificador en la URL');
    const error = await screen.findByText(
      'Ya tenés una campaña con el identificador «mostrador». Escribí otro, por ejemplo «mostrador-2».',
    );
    expect(slug).toHaveFocus();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(slug.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('dice en qué negocio se crea la campaña', async () => {
    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));

    expect(screen.getByText(/Se crea en/)).toHaveTextContent('Se crea en Café de la Esquina.');
  });

  it('explica que el identificador queda impreso y no se puede cambiar', async () => {
    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));

    expect(screen.getByText(/no se puede cambiar después/)).toBeInTheDocument();
    // Sin placeholder que parezca un valor ya cargado.
    expect(screen.getByLabelText('Identificador en la URL')).not.toHaveAttribute('placeholder');
  });
});

describe('sucursales sin link de reseñas', () => {
  it('deshabilita la sucursal en el selector y explica por qué', async () => {
    givenMock.locationWithoutReviewUrl(mockImportedLocation.urn);
    givenMock.campaigns([]);
    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));

    // Con una sola sucursal y sin link, directamente no se puede crear nada.
    expect(await screen.findByText('Ninguna de tus sucursales tiene link de reseñas en Google')).toBeInTheDocument();
  });

  it('con varias sucursales, deja elegir solo las que sirven', async () => {
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () =>
        HttpResponse.json([
          {
            urn: mockImportedLocation.urn,
            title: 'Centro',
            hasVoiceOfMerchant: true,
            isActive: true,
            createdAt: '2026-06-16T02:26:10.637Z',
            googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ficticio',
          },
          {
            urn: 'urn:location:deposito',
            title: 'Depósito',
            hasVoiceOfMerchant: false,
            isActive: true,
            createdAt: '2026-06-16T02:26:10.637Z',
          },
        ]),
      ),
    );

    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));

    const select = screen.getByLabelText('Sucursal');
    const sinLink = within(select).getByRole('option', { name: /Depósito/ });

    expect(sinLink).toBeDisabled();
    expect(sinLink).toHaveTextContent('sin link de reseñas en Google');
    expect(within(select).getByRole('option', { name: 'Centro' })).toBeEnabled();
  });

  it('si el backend igual lo rechaza, muestra su mensaje', async () => {
    server.use(
      http.post(`${API_BASE_URL}/businesses/:businessUrn/campaigns`, () =>
        HttpResponse.json(apiErrorBody(400, 'LOCATION_NOT_REVIEWABLE'), { status: 400 }),
      ),
    );

    const { user } = renderApp([LISTA]);

    await user.click(await screen.findByRole('button', { name: 'Crear campaña' }));
    await user.type(screen.getByLabelText('Nombre de la campaña'), 'Mesas');
    await user.click(screen.getByRole('button', { name: 'Crear campaña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esa sucursal no tiene link de reseñas en Google.');
  });
});

/** Cuenta los POST al endpoint del QR (y opcionalmente cambia la respuesta). */
function countQrCalls(respond?: () => Response | Promise<Response>) {
  const counter = { calls: 0 };
  server.use(
    http.post(`${API_BASE_URL}/businesses/:b/campaigns/:c/qr`, async () => {
      counter.calls += 1;
      if (respond !== undefined) return respond();
      return HttpResponse.json({ targetUrl: mockCampaigns[0]!.targetUrl, pngDataUrl: mockQrPngDataUrl });
    }),
  );
  return counter;
}

const QR_ALT = 'Código QR de la campaña Mostrador';

describe('QR', () => {
  it('lo genera solo al abrir, una única vez aunque StrictMode monte dos veces', async () => {
    const counter = countQrCalls();
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByAltText(QR_ALT)).toHaveAttribute('src', mockQrPngDataUrl);
    expect(counter.calls).toBe(1);
  });

  it('volver a la pantalla no lo pide de nuevo: es el mismo QR', async () => {
    const counter = countQrCalls();
    const { router } = renderApp([detalle('urn:campaign:mostrador')]);

    await screen.findByAltText(QR_ALT);
    await router.navigate('/campaigns');
    await screen.findByRole('heading', { name: 'Campañas y QR' });
    await router.navigate(detalle('urn:campaign:mostrador'));

    expect(await screen.findByAltText(QR_ALT)).toBeInTheDocument();
    expect(counter.calls).toBe(1);
  });

  it('no ofrece "volver a generar": la URL del QR no cambia', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    await screen.findByAltText(QR_ALT);
    expect(screen.queryByRole('button', { name: /generar/i })).not.toBeInTheDocument();
  });

  it('mientras se prepara lo anuncia y reserva el lugar del QR', async () => {
    countQrCalls(async () => {
      await delay('infinite');
      return HttpResponse.json({});
    });
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText('Preparando el QR…')).toBeInTheDocument();
    expect(screen.getByText('Preparando el QR…').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
  });

  it('si falla, lo dice con un solo pedido y deja reintentar a mano', async () => {
    let fail = true;
    const calls = countQrCalls(() =>
      fail
        ? HttpResponse.json(apiErrorBody(500, 'INTERNAL_SERVER_ERROR'), { status: 500 })
        : HttpResponse.json({ targetUrl: mockCampaigns[0]!.targetUrl, pngDataUrl: mockQrPngDataUrl }),
    );
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText('No pudimos preparar el QR')).toBeInTheDocument();
    // Un solo POST: sin los reintentos automáticos de la política global.
    expect(calls.calls).toBe(1);

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByAltText(QR_ALT)).toBeInTheDocument();
    expect(calls.calls).toBe(2);
  });

  it('se puede imprimir', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    await user.click(await screen.findByRole('button', { name: 'Imprimir' }));

    expect(print).toHaveBeenCalled();
  });

  it('descarga el QR solo (con margen y dpi propios) y la hoja A4, con nombres reconocibles', async () => {
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    await user.click(await screen.findByRole('button', { name: 'Descargar solo el QR' }));
    expect(printSheet.renderQrPng).toHaveBeenCalledWith(mockQrPngDataUrl);
    expect(printSheet.downloadBlob).toHaveBeenLastCalledWith(expect.any(Blob), 'qr-cafe-de-la-esquina-mostrador.png');

    await user.click(screen.getByRole('button', { name: 'Descargar hoja A4' }));
    expect(printSheet.downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      'qr-cafe-de-la-esquina-mostrador-hoja-a4.png',
    );
  });

  it('si el navegador no puede armar la descarga, lo dice', async () => {
    vi.mocked(printSheet.renderQrPng).mockRejectedValueOnce(new Error('sin canvas'));
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    await user.click(await screen.findByRole('button', { name: 'Descargar solo el QR' }));

    expect(await screen.findByText(/No pudimos preparar la descarga en este navegador/)).toBeInTheDocument();
  });

  it('la hoja lleva el negocio, la sucursal sin repetir el negocio y la URL para quien no puede escanear', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    const image = await screen.findByAltText(QR_ALT);
    const sheet = image.closest<HTMLElement>('.hoja-qr')!;
    expect(within(sheet).getByText('Café de la Esquina')).toBeInTheDocument();
    expect(within(sheet).getByText('Centro')).toBeInTheDocument();
    expect(within(sheet).queryByText('Café de la Esquina — Centro')).not.toBeInTheDocument();
    expect(within(sheet).getByText('localhost:5173/r/cafe-de-la-esquina/mostrador')).toBeInTheDocument();
    expect(within(sheet).getByText('Dejanos tu reseña en Google')).toBeInTheDocument();
  });

  it('la URL impresa se corta solo donde hace falta, no en cualquier letra', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    const url = await screen.findByText('localhost:5173/r/cafe-de-la-esquina/mostrador');
    expect(url).toHaveClass('[overflow-wrap:anywhere]');
    expect(url).not.toHaveClass('break-all');
  });

  it('muestra a dónde lleva: negocio, sucursal con dirección y la página de Google', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    const heading = await screen.findByRole('heading', { name: 'A dónde lleva' });
    const card = heading.closest<HTMLElement>('[data-slot="card"]')!;
    expect(within(card).getByText('Café de la Esquina — Centro')).toBeInTheDocument();
    expect(within(card).getByText('Av. Corrientes 1234, CABA')).toBeInTheDocument();
    expect(within(card).getByText('http://localhost:5173/r/cafe-de-la-esquina/mostrador')).toBeInTheDocument();
  });

  it('el link a Google va directo a la página de reseñas: no pasa por el QR ni suma escaneos', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    const google = await screen.findByRole('link', { name: 'Ver la página de reseñas' });
    expect(google).toHaveAttribute('href', 'https://search.google.com/local/writereview?placeid=ficticio');
    expect(google.getAttribute('href')).not.toContain('/r/');
    expect(google.getAttribute('href')).not.toContain('/public/');
    expect(google).toHaveAttribute('target', '_blank');
  });

  it('avisa si la URL del QR apunta a esta computadora (un teléfono no la abre)', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText('Este QR no va a abrir en un teléfono')).toBeInTheDocument();
    expect(screen.getByText(/Apunta a localhost:5173/)).toBeInTheDocument();
  });

  it('con una URL pública no muestra ese aviso', async () => {
    const targetUrl = 'https://app.opinara.com/r/cafe-de-la-esquina/mostrador';
    givenMock.campaigns([{ ...mockCampaigns[0]!, targetUrl }]);
    renderApp([detalle('urn:campaign:mostrador')]);

    await screen.findByAltText(QR_ALT);
    expect(screen.queryByText('Este QR no va a abrir en un teléfono')).not.toBeInTheDocument();
  });

  it('aclara qué son los escaneos', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText('Veces que se abrió el QR.')).toBeInTheDocument();
  });

  it('no lo pide hasta poder confirmar la sucursal', async () => {
    const counter = countQrCalls();
    server.use(http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () => delay('infinite')));
    renderApp([detalle('urn:campaign:mostrador')]);

    // La campaña ya está a la vista, pero sin sucursales no se sabe si el QR llevaría a Google.
    await screen.findByRole('heading', { name: 'Mostrador' });
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
    expect(counter.calls).toBe(0);
  });

  it('si las sucursales no cargan, no genera nada y deja reintentar', async () => {
    const counter = countQrCalls();
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () =>
        HttpResponse.json(apiErrorBody(400, 'BAD_REQUEST'), { status: 400 }),
      ),
    );
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText('No pudimos comprobar a dónde lleva el QR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
    expect(counter.calls).toBe(0);
  });

  it('a un MEMBER no se lo pide y le explica quién puede bajarlo', async () => {
    const counter = countQrCalls();
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText(/El QR lo descargan el dueño o un administrador del negocio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
    // El destino sí lo puede ver; el aviso de URL local no (no tiene un QR que imprimir).
    expect(screen.getByRole('heading', { name: 'A dónde lleva' })).toBeInTheDocument();
    expect(screen.queryByText('Este QR no va a abrir en un teléfono')).not.toBeInTheDocument();
    expect(counter.calls).toBe(0);
  });

  it('muestra el mensaje propio si la campaña no existe', async () => {
    renderApp([detalle('urn:campaign:no-existe')]);

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos la campaña.');
  });
});

describe('QR que no llevaría a Google: no se genera ni se imprime', () => {
  const expectBlocked = async (title: string | RegExp, counter: { calls: number }) => {
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar solo el QR' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar hoja A4' })).not.toBeInTheDocument();
    expect(screen.queryByText('Este QR no va a abrir en un teléfono')).not.toBeInTheDocument();
    expect(counter.calls).toBe(0);
  };

  it.each([
    ['PAUSED', 'Esta campaña está pausada'],
    ['ARCHIVED', 'Esta campaña está archivada'],
  ] as const)('campaña %s', async (status, title) => {
    const counter = countQrCalls();
    givenMock.campaigns([{ ...mockCampaigns[0]!, status }]);
    renderApp([detalle('urn:campaign:mostrador')]);

    await expectBlocked(title, counter);
  });

  it.each(['PAUSED', 'ARCHIVED'] as const)(
    'campaña %s: muestra su sucursal real, no "no encontrada"',
    async (status) => {
      givenMock.campaigns([{ ...mockCampaigns[0]!, status }]);
      renderApp([detalle('urn:campaign:mostrador')]);

      await screen.findByRole('heading', { name: 'Mostrador' });
      expect(await screen.findAllByText('Café de la Esquina — Centro')).not.toHaveLength(0);
      expect(screen.queryByText('Sucursal no encontrada')).not.toBeInTheDocument();
      expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
    },
  );

  it('sucursal desactivada', async () => {
    const counter = countQrCalls();
    givenMock.locationInactive(mockImportedLocation.urn);
    renderApp([detalle('urn:campaign:mostrador')]);

    await expectBlocked('La sucursal Café de la Esquina — Centro está desactivada', counter);
    expect(screen.getByRole('link', { name: 'Revisar sucursales' })).toHaveAttribute('href', '/settings/google');
  });

  it('sucursal sin link de reseñas en Google', async () => {
    const counter = countQrCalls();
    givenMock.locationWithoutReviewUrl(mockImportedLocation.urn);
    renderApp([detalle('urn:campaign:mostrador')]);

    await expectBlocked('Café de la Esquina — Centro no tiene link de reseñas en Google', counter);
  });

  it('sucursal que ya no existe', async () => {
    const counter = countQrCalls();
    givenMock.campaigns([{ ...mockCampaigns[0]!, locationUrn: 'urn:location:borrada' }]);
    renderApp([detalle('urn:campaign:mostrador')]);

    await expectBlocked('No encontramos la sucursal de esta campaña', counter);
    // Nunca el URN crudo como si fuera un nombre.
    expect(screen.queryByText('urn:location:borrada')).not.toBeInTheDocument();
  });

  it('sucursal con un link que no es una URL https válida', async () => {
    const counter = countQrCalls();
    server.use(
      http.get(`${API_BASE_URL}/businesses/:businessUrn/locations`, () =>
        HttpResponse.json([
          {
            urn: mockImportedLocation.urn,
            title: mockImportedLocation.title,
            hasVoiceOfMerchant: true,
            isActive: true,
            createdAt: '2026-06-16T02:26:10.637Z',
            googleReviewUrl: 'javascript:alert(1)',
          },
        ]),
      ),
    );
    renderApp([detalle('urn:campaign:mostrador')]);

    await expectBlocked(/no tiene link de reseñas en Google/, counter);
  });

  it('campaña activa y sucursal activa con link: se genera', async () => {
    const counter = countQrCalls();
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByAltText(QR_ALT)).toBeInTheDocument();
    expect(counter.calls).toBe(1);
  });
});

describe('estudio de impresión', () => {
  it('por defecto es el cartel A4, con su descarga en PNG', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByRole('radio', { name: /Cartel A4/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Descargar hoja A4' })).toBeInTheDocument();
  });

  it('el señalador de mesa repite el QR en las dos caras, con un solo texto alternativo', async () => {
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    await user.click(await screen.findByRole('radio', { name: /Señalador de mesa/ }));

    const sheet = (await screen.findByAltText(QR_ALT)).closest<HTMLElement>('.hoja-qr')!;
    expect(sheet.querySelectorAll('img')).toHaveLength(2);
    expect(within(sheet).getAllByAltText(QR_ALT)).toHaveLength(1);
    // El PNG es del cartel: para los otros formatos no se ofrece.
    expect(screen.queryByRole('button', { name: 'Descargar hoja A4' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument();
  });

  it('los stickers son seis por hoja', async () => {
    const { user } = renderApp([detalle('urn:campaign:mostrador')]);

    await user.click(await screen.findByRole('radio', { name: /Stickers/ }));

    const sheet = (await screen.findByAltText(QR_ALT)).closest<HTMLElement>('.hoja-qr')!;
    expect(sheet.querySelectorAll('img')).toHaveLength(6);
    expect(within(sheet).getAllByAltText(QR_ALT)).toHaveLength(1);
  });
});

describe('escaneos por semana en el detalle', () => {
  it('muestra la evolución y desde cuándo hay datos con fecha', async () => {
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByRole('heading', { name: 'Escaneos por semana' })).toBeInTheDocument();
    expect(await screen.findByText(/Escaneos con fecha desde el/)).toBeInTheDocument();
  });

  it('sin escaneos con fecha lo explica en vez de dibujar un gráfico vacío sin contexto', async () => {
    givenMock.scanWeeks([]);
    renderApp([detalle('urn:campaign:mostrador')]);

    expect(await screen.findByText(/Todavía no hay escaneos con fecha/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Escaneos por semana' })).not.toBeInTheDocument();
  });
});
