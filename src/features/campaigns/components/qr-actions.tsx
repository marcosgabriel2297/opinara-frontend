import { DownloadIcon, FileImageIcon, PrinterIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

import { type GeneratedQr } from '../api/schemas';
import { printableUrl } from '../destination';
import { downloadBlob, renderQrPng, renderSheetPng } from '../print-sheet';

import { QR_FORMATS, type QrFormat } from '../qr-formats';

interface QrActionsProps {
  format: QrFormat;
  onFormatChange: (format: QrFormat) => void;
  qr: GeneratedQr;
  businessName: string;
  businessSlug: string;
  logoUrl: string | null;
  branch: string | null;
  campaignSlug: string;
}

/**
 * Lo que se hace con el QR. Imprimir es la acción principal: es para lo que se viene a esta
 * pantalla. Las descargas son para quien lo manda a una imprenta o lo pasa por WhatsApp.
 */
export function QrActions({
  qr,
  businessName,
  businessSlug,
  logoUrl,
  branch,
  campaignSlug,
  format,
  onFormatChange,
}: QrActionsProps) {
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');
  const baseName = `qr-${businessSlug}-${campaignSlug}`;

  /** Las dos descargas se arman en el navegador; si el canvas no está disponible, se avisa. */
  const download = async (render: () => Promise<Blob>, fileName: string) => {
    setState('working');
    try {
      downloadBlob(await render(), fileName);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  const sheet = () =>
    renderSheetPng({
      businessName,
      branch,
      headline: t.campaigns.detail.printHeadline,
      subhead: t.campaigns.detail.printSubhead,
      fallback: `${t.campaigns.detail.printFallback} ${printableUrl(qr.targetUrl)}`,
      qrPngDataUrl: qr.pngDataUrl,
      logoUrl,
    });

  return (
    <div className="no-imprimir grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">{t.campaigns.detail.formatLabel}</legend>
        {QR_FORMATS.map((option) => (
          <label
            key={option}
            className="has-[:checked]:border-primary has-[:checked]:bg-brand-soft flex min-h-14 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5"
          >
            <input
              type="radio"
              name="qr-format"
              value={option}
              checked={format === option}
              onChange={() => {
                onFormatChange(option);
              }}
              className="accent-primary mt-1 size-4"
            />
            <span className="grid">
              <span className="text-sm font-medium">{t.campaigns.detail.formats[option].name}</span>
              <span className="text-muted-foreground text-xs">{t.campaigns.detail.formats[option].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2">
        <Button
          onClick={() => {
            window.print();
          }}
        >
          <PrinterIcon aria-hidden />
          {t.campaigns.detail.print}
        </Button>
        {/* La versión PNG existe solo para el cartel: es la que se manda a una imprenta. */}
        {format === 'poster' && (
          <Button
            variant="outline"
            disabled={state === 'working'}
            onClick={() => void download(sheet, `${baseName}-hoja-a4.png`)}
          >
            <FileImageIcon aria-hidden />
            {t.campaigns.detail.downloadSheet}
          </Button>
        )}
        {/* No es el PNG del backend tal cual: se le agrega el margen de 4 módulos y los 300 dpi. */}
        <Button
          variant="outline"
          disabled={state === 'working'}
          onClick={() => void download(() => renderQrPng(qr.pngDataUrl), `${baseName}.png`)}
        >
          <DownloadIcon aria-hidden />
          {t.campaigns.detail.download}
        </Button>
      </div>
      {state === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>{t.campaigns.detail.downloadError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
