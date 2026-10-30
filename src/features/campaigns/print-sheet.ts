/**
 * Las descargas del QR, armadas en el navegador con un `<canvas>` (sin dependencias): la hoja A4
 * completa y el QR solo.
 *
 * La hoja A4 del QR como PNG, armada en el navegador con un `<canvas>` (sin dependencias).
 *
 * Es la misma hoja que sale con "Imprimir", para quien la quiere mandar a una imprenta o por
 * WhatsApp. Calidad: 300 dpi; el QR se dibuja sin suavizado, así que los módulos quedan con bordes
 * nítidos aunque el PNG del backend (512px) se agrande a 110mm. El archivo declara sus 300 dpi en un
 * bloque `pHYs`: sin eso, un programa podría imprimirlo a 72 dpi, cuatro veces más grande.
 */

const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const PX_PER_PT = DPI / 72;
const PAGE = { width: Math.round(210 * PX_PER_MM), height: Math.round(297 * PX_PER_MM) };
const MARGIN = 15 * PX_PER_MM;
const GAP = 6 * PX_PER_MM;
/** Mismas medidas que la hoja impresa (`print:` en `qr-sheet.tsx`). */
const QR_SIZE = Math.round(110 * PX_PER_MM);

export interface SheetContent {
  businessName: string;
  branch: string | null;
  headline: string;
  subhead: string;
  fallback: string;
  qrPngDataUrl: string;
  /** El logo del negocio (`logoUrl`). Si no carga, la hoja sale sin él: no frena la descarga. */
  logoUrl?: string | null;
}

/** Mismas medidas que el logo de la hoja impresa (`print:max-h-[28mm] print:max-w-[120mm]`). */
const LOGO_MAX = { height: 28 * PX_PER_MM, width: 120 * PX_PER_MM };

type Block =
  | { kind: 'text'; text: string; pt: number; weight: number }
  | { kind: 'qr' }
  | { kind: 'logo'; image: HTMLImageElement; width: number; height: number };

export async function renderSheetPng(content: SheetContent): Promise<Blob> {
  const qr = await loadImage(content.qrPngDataUrl);
  const logo = content.logoUrl == null ? null : await loadLogo(content.logoUrl);

  const canvas = document.createElement('canvas');
  canvas.width = PAGE.width;
  canvas.height = PAGE.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('El navegador no permite dibujar en un canvas');

  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const font = (pt: number, weight: number) => `${String(weight)} ${String(Math.round(pt * PX_PER_PT))}px ${family}`;
  const maxWidth = PAGE.width - 2 * MARGIN;

  const blocks: Block[] = [
    ...(logo === null ? [] : [logoBlock(logo)]),
    { kind: 'text', text: content.businessName, pt: 24, weight: 600 },
    ...(content.branch === null ? [] : [{ kind: 'text', text: content.branch, pt: 16, weight: 400 } as const]),
    { kind: 'qr' },
    { kind: 'text', text: content.headline, pt: 32, weight: 700 },
    { kind: 'text', text: content.subhead, pt: 16, weight: 400 },
    { kind: 'text', text: content.fallback, pt: 12, weight: 400 },
  ];

  // Primero se mide todo para centrar la hoja en la página, como la versión impresa.
  const measured = blocks.map((block) => {
    if (block.kind === 'qr') return { block, lines: [] as string[], lineHeight: 0, height: QR_SIZE };
    if (block.kind === 'logo') return { block, lines: [] as string[], lineHeight: 0, height: block.height };
    ctx.font = font(block.pt, block.weight);
    const lineHeight = block.pt * PX_PER_PT * 1.2;
    const lines = wrap(ctx, block.text, maxWidth);
    return { block, lines, lineHeight, height: lines.length * lineHeight };
  });
  const total = measured.reduce((sum, item) => sum + item.height, 0) + GAP * (measured.length - 1);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE.width, PAGE.height);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let y = Math.max(MARGIN, (PAGE.height - total) / 2);
  for (const { block, lines, lineHeight, height } of measured) {
    if (block.kind === 'qr') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, Math.round((PAGE.width - QR_SIZE) / 2), Math.round(y), QR_SIZE, QR_SIZE);
    } else if (block.kind === 'logo') {
      // El logo sí se suaviza: se agranda de 512px a 28mm a 300 dpi.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(block.image, Math.round((PAGE.width - block.width) / 2), Math.round(y), block.width, block.height);
    } else {
      ctx.font = font(block.pt, block.weight);
      lines.forEach((line, index) => {
        ctx.fillText(line, PAGE.width / 2, y + index * lineHeight);
      });
    }
    y += height + GAP;
  }

  return withDpi(await toPngBlob(canvas), DPI);
}

async function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (blob === null) throw new Error('No se pudo exportar el canvas');
  return blob;
}

/** El QR solo: 50mm a 300 dpi, con 4 módulos de margen blanco por lado (ISO/IEC 18004). */
export const SINGLE_QR = { sizeMm: 50, quietZoneModules: 4, dpi: DPI } as const;

export interface PixelData {
  width: number;
  height: number;
  /** RGBA, como `ImageData.data`. */
  data: Uint8ClampedArray | Uint8Array;
}

export interface QrGrid {
  /** Margen blanco del PNG de origen, en px (el backend usa 2 módulos). */
  marginPx: number;
  modulePx: number;
  /** Módulos por lado del QR, sin margen: 17 + 4 × versión. */
  modules: number;
}

/**
 * Lee la grilla de un QR cuadrado sobre fondo blanco, sin decodificarlo: el margen es donde empieza
 * la esquina del patrón de posición de arriba a la izquierda, y ese patrón mide 7 módulos.
 *
 * Si lo medido no es un QR válido (21 a 177 módulos, de a 4) tira un error: mejor no descargar nada
 * que descargar un QR reconstruido mal.
 */
export function measureQrGrid(image: PixelData): QrGrid {
  const dark = (x: number, y: number) => (image.data[(y * image.width + x) * 4] ?? 255) < 128;

  let marginPx = 0;
  while (marginPx < image.width && !dark(marginPx, marginPx)) marginPx += 1;

  let finderPx = 0;
  while (marginPx + finderPx < image.width && dark(marginPx + finderPx, marginPx)) finderPx += 1;

  const modulePx = finderPx / 7;
  const modules = modulePx > 0 ? Math.round((image.width - 2 * marginPx) / modulePx) : 0;
  if (modules < 21 || modules > 177 || (modules - 17) % 4 !== 0) {
    throw new Error('La imagen no tiene la grilla de un QR');
  }

  return { marginPx, modulePx, modules };
}

/**
 * Dónde va el QR en la imagen de 50mm. El margen se redondea hacia arriba, así nunca queda por
 * debajo de 4 módulos; el QR ocupa exactamente el resto.
 */
export function singleQrLayout(modules: number) {
  const sizePx = Math.round(SINGLE_QR.sizeMm * PX_PER_MM);
  const modulePx = sizePx / (modules + 2 * SINGLE_QR.quietZoneModules);
  const offsetPx = Math.ceil(SINGLE_QR.quietZoneModules * modulePx);
  return { sizePx, offsetPx, qrPx: sizePx - 2 * offsetPx };
}

/**
 * El QR solo, listo para una imprenta. Se recorta la zona de módulos del PNG del backend (sin su
 * margen de 2 módulos) y se redibuja sin suavizado, con el margen que pide el estándar: la matriz
 * es la misma, solo cambian la escala y el blanco alrededor.
 */
export async function renderQrPng(pngDataUrl: string): Promise<Blob> {
  const image = await loadImage(pngDataUrl);

  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  if (sourceCtx === null) throw new Error('El navegador no permite dibujar en un canvas');
  sourceCtx.drawImage(image, 0, 0);
  const grid = measureQrGrid(sourceCtx.getImageData(0, 0, source.width, source.height));

  const layout = singleQrLayout(grid.modules);
  const canvas = document.createElement('canvas');
  canvas.width = layout.sizePx;
  canvas.height = layout.sizePx;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('El navegador no permite dibujar en un canvas');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, layout.sizePx, layout.sizePx);
  ctx.imageSmoothingEnabled = false;
  const cropPx = source.width - 2 * grid.marginPx;
  ctx.drawImage(
    image,
    grid.marginPx,
    grid.marginPx,
    cropPx,
    cropPx,
    layout.offsetPx,
    layout.offsetPx,
    layout.qrPx,
    layout.qrPx,
  );

  return withDpi(await toPngBlob(canvas), SINGLE_QR.dpi);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  // Después del click el navegador ya tomó el archivo.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** Lo más grande que entra en `LOGO_MAX` sin deformarlo. */
function logoBlock(image: HTMLImageElement): Block {
  const scale = Math.min(LOGO_MAX.width / image.naturalWidth, LOGO_MAX.height / image.naturalHeight);
  return {
    kind: 'logo',
    image,
    width: Math.round(image.naturalWidth * scale),
    height: Math.round(image.naturalHeight * scale),
  };
}

/**
 * El logo viene de la API (otro origen): se baja con `fetch` y se dibuja desde un `blob:` para
 * que el canvas no quede "contaminado" y se pueda exportar.
 */
async function loadLogo(url: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      const image = await loadImage(objectUrl);
      return image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('No se pudo cargar la imagen del QR'));
    };
    image.src = src;
  });
}

/** Parte un texto en líneas que entren en `maxWidth`. Una palabra más larga que el ancho va sola. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (line !== '' && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** Inserta un bloque `pHYs` (resolución física) después del `IHDR` del PNG. */
export async function withDpi(png: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await png.arrayBuffer());
  const pixelsPerMeter = Math.round(dpi / 0.0254);

  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // largo de los datos
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, pixelsPerMeter);
  view.setUint32(12, pixelsPerMeter);
  chunk[16] = 1; // unidad: metro
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  // Firma (8 bytes) + IHDR (4 de largo + 4 de tipo + 13 de datos + 4 de CRC) = 33 bytes.
  const IHDR_END = 33;
  return new Blob([bytes.subarray(0, IHDR_END), chunk, bytes.subarray(IHDR_END)], { type: 'image/png' });
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
