import { t } from '@/i18n';
import { cn } from '@/lib/utils';

import { printableUrl } from '../destination';
import { type QrFormat } from '../qr-formats';

/** Seis stickers por hoja: 2 × 3 de 80mm, con lugar para cortar (entran en el A4 con márgenes de 15mm). */
const STICKERS_PER_SHEET = 6;

interface QrSheetProps {
  businessName: string;
  /** La sucursal sin repetir el nombre del negocio; `null` si no agrega nada. */
  branch: string | null;
  campaignName: string;
  /** `undefined` mientras se prepara: se dibuja el lugar del QR para que nada salte al llegar. */
  qr: { pngDataUrl: string; targetUrl: string } | undefined;
  /** El logo del negocio (`logoUrl`), o `null`: sin logo la hoja queda solo con el nombre. */
  logoUrl?: string | null;
  format?: QrFormat;
}

/**
 * La hoja que se pega en el local. En pantalla es la vista previa; al imprimir es lo único que sale
 * (`.hoja-qr` en `index.css`). Todo en negro sobre blanco, sin marca de Opinara: la hoja es del
 * negocio.
 *
 * - `poster`: cartel A4 con el QR de 110mm, el llamado a 32pt y la URL para quien no puede escanear.
 *   Sus medidas están repetidas en `print-sheet.ts` (la versión PNG): si cambian acá, cambian allá.
 * - `tent`: señalador de mesa. Un A4 que se dobla al medio: la mitad de arriba va invertida, así
 *   parado se lee igual de los dos lados.
 * - `stickers`: seis por hoja, para pegar en mesas, vidrieras o la caja.
 *
 * Con logo, va arriba del nombre (en los stickers, en su lugar: no entran los dos). Sin logo no se
 * pone el de Opinara: la hoja sigue siendo del negocio.
 */
export function QrSheet({ businessName, branch, campaignName, qr, logoUrl = null, format = 'poster' }: QrSheetProps) {
  if (format === 'tent') {
    return (
      <div
        className={cn(
          'hoja-qr grid w-full max-w-sm grid-rows-2 rounded-md border bg-white text-center text-black',
          'print:h-[267mm] print:max-w-none print:rounded-none',
        )}
      >
        {/* La línea punteada marca el doblez. */}
        <TentPanel
          businessName={businessName}
          branch={branch}
          campaignName={campaignName}
          qr={qr}
          logoUrl={logoUrl}
          flipped
        />
        <TentPanel businessName={businessName} branch={branch} campaignName={campaignName} qr={qr} logoUrl={logoUrl} />
      </div>
    );
  }

  if (format === 'stickers') {
    return (
      <div
        className={cn(
          'hoja-qr grid w-full max-w-sm grid-cols-2 gap-2 rounded-md border bg-white p-3 text-center text-black',
          'print:max-w-none print:grid-cols-[80mm_80mm] print:justify-center print:gap-[6mm] print:rounded-none print:border-0 print:p-0',
        )}
      >
        {Array.from({ length: STICKERS_PER_SHEET }, (_, index) => (
          <div
            key={index}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-full border border-dashed border-black/40 p-3 print:h-[80mm] print:w-[80mm] print:gap-[2mm]"
          >
            <QrImage qr={qr} campaignName={campaignName} className="w-1/2 print:w-[45mm]" decorative={index > 0} />
            <p className="text-[0.625rem] leading-tight font-bold print:text-[11pt]">
              {t.campaigns.detail.printHeadline}
            </p>
            {logoUrl === null ? (
              <p className="text-[0.5625rem] leading-tight print:text-[9pt]">{businessName}</p>
            ) : (
              <SheetLogo url={logoUrl} className="max-h-4 max-w-[60%] print:max-h-[9mm]" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'hoja-qr flex w-full max-w-sm flex-col items-center gap-3 rounded-md border bg-white px-6 py-8 text-center text-black',
        'print:min-h-[260mm] print:max-w-none print:justify-center print:gap-[6mm] print:rounded-none print:p-0',
      )}
    >
      {logoUrl !== null && (
        <SheetLogo url={logoUrl} className="max-h-16 max-w-48 print:max-h-[28mm] print:max-w-[120mm]" />
      )}
      <p className="text-lg leading-tight font-semibold print:text-[24pt]">{businessName}</p>
      {branch !== null && <p className="text-sm print:text-[16pt]">{branch}</p>}

      <QrImage qr={qr} campaignName={campaignName} className="w-64 print:w-[110mm]" />

      <p className="text-xl leading-tight font-bold text-balance print:text-[32pt]">
        {t.campaigns.detail.printHeadline}
      </p>
      <p className="text-sm print:text-[16pt]">{t.campaigns.detail.printSubhead}</p>
      {qr !== undefined && (
        <p className="text-xs print:text-[12pt]">
          {t.campaigns.detail.printFallback}{' '}
          <span className="font-medium [overflow-wrap:anywhere]">{printableUrl(qr.targetUrl)}</span>
        </p>
      )}
    </div>
  );
}

function TentPanel({
  businessName,
  branch,
  campaignName,
  qr,
  logoUrl = null,
  flipped = false,
}: Omit<QrSheetProps, 'format'> & { flipped?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-4 py-5 print:gap-[4mm] print:p-0',
        flipped ? 'rotate-180 border-t border-dashed border-black/40' : '',
      )}
    >
      {logoUrl !== null && (
        <SheetLogo url={logoUrl} className="max-h-8 max-w-40 print:max-h-[16mm] print:max-w-[90mm]" />
      )}
      <p className="text-sm leading-tight font-semibold print:text-[18pt]">
        {businessName}
        {branch !== null && <span className="font-normal"> · {branch}</span>}
      </p>
      <QrImage qr={qr} campaignName={campaignName} className="w-28 print:w-[70mm]" decorative={flipped} />
      <p className="text-base leading-tight font-bold print:text-[22pt]">{t.campaigns.detail.printHeadline}</p>
      <p className="text-xs print:text-[12pt]">{t.campaigns.detail.printSubhead}</p>
    </div>
  );
}

/** El logo en la hoja. El nombre del negocio va impreso al lado, así que es decorativo. */
function SheetLogo({ url, className }: { url: string; className: string }) {
  return <img src={url} alt="" className={cn('w-auto object-contain', className)} />;
}

/**
 * El QR, sin suavizado: al agrandar el PNG (en pantalla o en papel) los módulos quedan nítidos.
 * Cuando la hoja repite el QR, solo el primero lleva texto alternativo: los demás son copias.
 */
function QrImage({
  qr,
  campaignName,
  className,
  decorative = false,
}: {
  qr: QrSheetProps['qr'];
  campaignName: string;
  className: string;
  decorative?: boolean;
}) {
  if (qr === undefined) {
    return (
      <div
        aria-hidden
        className={cn(
          'bg-muted aspect-square max-w-full animate-pulse rounded-md motion-reduce:animate-none',
          className,
        )}
      />
    );
  }

  return (
    <img
      src={qr.pngDataUrl}
      alt={decorative ? '' : `Código QR de la campaña ${campaignName}`}
      width={512}
      height={512}
      className={cn('aspect-square h-auto max-w-full [image-rendering:pixelated]', className)}
    />
  );
}
