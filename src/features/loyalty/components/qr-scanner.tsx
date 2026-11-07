import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

/** Lo mínimo de `BarcodeDetector` que se usa: TypeScript todavía no lo trae. */
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL_MS = 200;
/** El mismo QR frente a la cámara no se informa dos veces seguidas. */
const SAME_RESULT_MS = 2500;

interface QrScannerProps {
  /** Lo que leyó la cámara, tal cual. Quien lo usa decide si es una tarjeta. */
  onResult: (content: string) => void;
  onClose: () => void;
}

/**
 * La cámara trasera leyendo QR. Usa `BarcodeDetector` donde existe (Chrome en Android y macOS) y si
 * no, `jsqr` (Safari, Chrome en Windows o Linux), que se descarga recién acá. Sin cámara o sin
 * permiso, lo dice: la caja sigue andando con la búsqueda por celular.
 */
export function QrScanner({ onResult, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'starting' | 'scanning' | 'unavailable'>('starting');
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;
    // Se lee en una función: después de cada `await`, el cleanup pudo haberlo cambiado.
    const isCancelled = () => cancelled;
    let last = { content: '', at: 0 };

    const report = (content: string) => {
      const now = Date.now();
      if (content === last.content && now - last.at < SAME_RESULT_MS) return;
      last = { content, at: now };
      onResultRef.current(content);
    };

    const start = async () => {
      const video = videoRef.current;
      if (video === null || !('mediaDevices' in navigator)) {
        setState('unavailable');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        if (!isCancelled()) setState('unavailable');
        return;
      }
      if (isCancelled()) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }

      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const read = await createReader();
      if (isCancelled()) return;
      setState('scanning');

      timer = window.setInterval(() => {
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        void read(video)
          .then((content) => {
            if (content !== null && !isCancelled()) report(content);
          })
          .catch(() => undefined);
      }, SCAN_INTERVAL_MS);
    };

    void start();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  return (
    <div className="grid gap-3">
      {state === 'unavailable' ? (
        <p role="alert" className="bg-muted rounded-md p-4 text-sm">
          {t.loyalty.register.cameraUnavailable}
        </p>
      ) : (
        <>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} muted playsInline className="size-full object-cover" />
            {/* La mira: dónde poner el QR. */}
            <div aria-hidden className="absolute inset-[18%] rounded-lg border-4 border-white/80" />
          </div>
          <p className="text-muted-foreground text-center text-sm" aria-live="polite">
            {state === 'scanning' ? t.loyalty.register.scanning : t.common.loading}
          </p>
        </>
      )}
      <Button variant="outline" onClick={onClose}>
        {t.loyalty.register.stopScan}
      </Button>
    </div>
  );
}

type Reader = (video: HTMLVideoElement) => Promise<string | null>;

async function createReader(): Promise<Reader> {
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (Detector !== undefined) {
    try {
      const detector = new Detector({ formats: ['qr_code'] });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    } catch {
      // Existe pero no soporta QR en este equipo: se usa jsqr.
    }
  }

  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  return (video) => {
    if (context === null || video.videoWidth === 0) return Promise.resolve(null);
    // Alcanza con una imagen chica: el QR de la tarjeta tiene pocos módulos.
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return Promise.resolve(
      jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null,
    );
  };
}
