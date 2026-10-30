/** Lado mayor del logo guardado: sobra para la hoja impresa (28mm de alto) y pesa pocas decenas de KB. */
export const LOGO_MAX_SIDE = 512;
/** El tope del backend (`LOGO_MAX_BYTES`). */
export const LOGO_MAX_BYTES = 300 * 1024;
/** Lo que se acepta elegir. El SVG se pasa a imagen acá: el backend no lo acepta. */
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export type LogoErrorReason = 'unsupported' | 'unreadable' | 'tooLarge';

export class LogoError extends Error {
  readonly reason: LogoErrorReason;

  constructor(reason: LogoErrorReason) {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Deja el logo listo para subir: lo achica a `LOGO_MAX_SIDE` sin recortarlo (un logo apaisado
 * sigue apaisado) y lo pasa a WebP, o a PNG si el navegador no sabe exportar WebP. La
 * transparencia se conserva en los dos.
 */
export async function prepareLogo(file: File): Promise<Blob> {
  if (!LOGO_ACCEPT.split(',').includes(file.type)) throw new LogoError('unsupported');

  const image = await loadImage(file);
  // Un SVG sin tamaño propio llega con 0 × 0. Al ser vectorial se dibuja al máximo; una foto, a
  // lo sumo a su tamaño (agrandarla no le suma nada).
  const width = image.naturalWidth || LOGO_MAX_SIDE;
  const height = image.naturalHeight || LOGO_MAX_SIDE;
  const fit = LOGO_MAX_SIDE / Math.max(width, height);
  const scale = file.type === 'image/svg+xml' ? fit : Math.min(1, fit);
  const target = { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new LogoError('unreadable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, target.width, target.height);

  for (const quality of [0.9, 0.75, 0.6]) {
    const blob = await toBlob(canvas, 'image/webp', quality);
    // Safari viejo ignora el tipo pedido y devuelve PNG: igual sirve.
    const usable = blob !== null && (blob.type === 'image/webp' || blob.type === 'image/png') ? blob : null;
    if (usable !== null && usable.size <= LOGO_MAX_BYTES) return usable;
  }

  const png = await toBlob(canvas, 'image/png');
  if (png !== null && png.size <= LOGO_MAX_BYTES) return png;
  throw new LogoError('tooLarge');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new LogoError('unreadable'));
    };
    image.src = url;
  }).finally(() => {
    URL.revokeObjectURL(url);
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}
