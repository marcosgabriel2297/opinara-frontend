import { describe, expect, it } from 'vitest';

import { measureQrGrid, singleQrLayout, SINGLE_QR, withDpi, type PixelData } from './print-sheet';

/**
 * Un "QR" sintético: los tres patrones de posición sobre fondo blanco, con el margen y el tamaño de
 * módulo que se le pidan. Alcanza para medir la grilla, que es lo único que mira `measureQrGrid`.
 */
function syntheticQr(modules: number, modulePx: number, marginModules: number): PixelData {
  const size = (modules + 2 * marginModules) * modulePx;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  const paint = (mx: number, my: number) => {
    for (let y = 0; y < modulePx; y++) {
      for (let x = 0; x < modulePx; x++) {
        const index = (((my + marginModules) * modulePx + y) * size + (mx + marginModules) * modulePx + x) * 4;
        data[index] = data[index + 1] = data[index + 2] = 0;
      }
    }
  };
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const ring = x === 0 || y === 0 || x === 6 || y === 6;
        const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (ring || center) paint(ox + x, oy + y);
      }
    }
  };
  finder(0, 0);
  finder(modules - 7, 0);
  finder(0, modules - 7);
  return { width: size, height: size, data };
}

describe('measureQrGrid', () => {
  it('lee el margen, el tamaño de módulo y los módulos del QR del backend (versión 4, margen 2)', () => {
    expect(measureQrGrid(syntheticQr(33, 14, 2))).toEqual({ marginPx: 28, modulePx: 14, modules: 33 });
  });

  it('sirve para otras versiones y márgenes', () => {
    expect(measureQrGrid(syntheticQr(21, 5, 4))).toMatchObject({ marginPx: 20, modules: 21 });
    expect(measureQrGrid(syntheticQr(57, 6, 1))).toMatchObject({ marginPx: 6, modules: 57 });
  });

  it('una imagen que no es un QR no se descarga: tira error', () => {
    const blank: PixelData = { width: 100, height: 100, data: new Uint8ClampedArray(100 * 100 * 4).fill(255) };
    expect(() => measureQrGrid(blank)).toThrow();
  });
});

describe('singleQrLayout', () => {
  it('50mm a 300 dpi: 591px', () => {
    expect(singleQrLayout(33).sizePx).toBe(591);
    expect(SINGLE_QR).toMatchObject({ sizeMm: 50, dpi: 300, quietZoneModules: 4 });
  });

  it.each([21, 25, 33, 41, 57, 77])('con %i módulos deja al menos 4 módulos de margen de cada lado', (modules) => {
    const { sizePx, offsetPx, qrPx } = singleQrLayout(modules);
    const modulePx = qrPx / modules;
    expect(offsetPx / modulePx).toBeGreaterThanOrEqual(4);
    // Margen simétrico: el QR queda centrado y la imagen sigue midiendo 50mm.
    expect(offsetPx * 2 + qrPx).toBe(sizePx);
  });
});

describe('withDpi', () => {
  /*
   * CRC32 de referencia calculados aparte (zlib de Python), no con la implementación que se prueba:
   * así el test es un oráculo independiente.
   */
  const CRC = { IHDR: 0x1f15c489, IEND: 0xae426082, pHYs300dpi: 0x78a53f76 };

  /** El PNG más chico que alcanza para esto: firma + IHDR (1×1) + IEND. */
  function minimalPng(): Uint8Array<ArrayBuffer> {
    const chunk = (type: string, body: number[], crc: number) => {
      const bytes = new Uint8Array(12 + body.length);
      const view = new DataView(bytes.buffer);
      view.setUint32(0, body.length);
      bytes.set(new TextEncoder().encode(type), 4);
      bytes.set(body, 8);
      view.setUint32(8 + body.length, crc);
      return [...bytes];
    };
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return new Uint8Array([
      ...signature,
      ...chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0], CRC.IHDR),
      ...chunk('IEND', [], CRC.IEND),
    ]);
  }

  const ascii = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  it('agrega un pHYs de 300 dpi (11811 px/m) justo después del IHDR, con CRC válido', async () => {
    const out = new Uint8Array(await (await withDpi(new Blob([minimalPng()]), 300)).arrayBuffer());
    const view = new DataView(out.buffer);

    expect(ascii(out.subarray(37, 41))).toBe('pHYs');
    expect(view.getUint32(33)).toBe(9);
    expect(view.getUint32(41)).toBe(11811);
    expect(view.getUint32(45)).toBe(11811);
    expect(out[49]).toBe(1); // metros
    expect(view.getUint32(50)).toBe(CRC.pHYs300dpi);
    // Lo demás queda igual: sigue el IEND.
    expect(ascii(out.subarray(58, 62))).toBe('IEND');
  });
});
