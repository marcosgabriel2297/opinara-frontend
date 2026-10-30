import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { browser } from '@/lib/browser';

import { scanUrl } from '../api/public-api';
import { LandingShell } from '../components/landing-shell';
import { useNoIndex } from '../hooks/use-no-index';

/** Lo que tarda en reintentar solo. El límite del backend es por minuto: unos segundos alcanzan. */
const RETRY_SECONDS = 8;

/**
 * A donde manda el backend cuando un QR recibe demasiados escaneos seguidos desde la misma red
 * (un local lleno). Antes el cliente veía un JSON de error; ahora espera unos segundos y vuelve a
 * intentar solo, con un botón para no esperar.
 *
 * El reintento vuelve a pasar por el backend: si entra, cuenta el escaneo y redirige a Google.
 */
export default function BusyRoute() {
  const { businessSlug = '', campaignSlug = '' } = useParams();
  const target = scanUrl(businessSlug, campaignSlug);
  const [seconds, setSeconds] = useState(RETRY_SECONDS);

  useNoIndex();

  // El reintento tiene su propio timer: no depende de que la cuenta regresiva se vaya pintando.
  useEffect(() => {
    const retry = window.setTimeout(() => {
      browser.replaceWith(target);
    }, RETRY_SECONDS * 1000);
    const tick = window.setInterval(() => {
      setSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => {
      window.clearTimeout(retry);
      window.clearInterval(tick);
    };
  }, [target]);

  return (
    <LandingShell businessSlug={businessSlug}>
      <h1 className="text-2xl font-semibold text-balance">{t.landing.busyTitle}</h1>
      <p className="text-muted-foreground text-base">{t.landing.busyBody}</p>
      {/* La cuenta regresiva no se anuncia cada segundo: el texto de arriba ya dice qué pasa. */}
      <p aria-hidden className="text-muted-foreground text-sm tabular-nums">
        {t.landing.busyCountdown.replace('{seconds}', String(seconds))}
      </p>
      <Button
        size="touch"
        className="w-full"
        onClick={() => {
          browser.replaceWith(target);
        }}
      >
        {t.landing.busyRetry}
      </Button>
    </LandingShell>
  );
}
