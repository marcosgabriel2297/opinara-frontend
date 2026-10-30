import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { Spinner } from '@/components/ui/spinner';
import { t } from '@/i18n';
import { browser } from '@/lib/browser';

import { scanUrl } from '../api/public-api';
import { LandingShell } from '../components/landing-shell';
import { useNoIndex } from '../hooks/use-no-index';

/** Si a esta altura seguimos acá, algo frenó la navegación: ofrecemos el link a mano. */
const FALLBACK_DELAY_MS = 4000;

/**
 * Lo que abre el QR impreso: salta directo a Google.
 *
 * No hay formulario propio en el medio. Pedirle al cliente que opine dos veces (acá y después
 * en Google) es perderlo en el segundo paso, y la reseña que importa es la de Google.
 *
 * La métrica no se pierde: el backend cuenta el escaneo al resolver la redirección. Por eso el
 * QR sigue apuntando a esta ruta y no a Google: los QR ya impresos siguen andando y cada
 * escaneo queda registrado.
 */
export default function PublicLandingRoute() {
  const { businessSlug = '', campaignSlug = '' } = useParams();
  const target = scanUrl(businessSlug, campaignSlug);

  const redirected = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useNoIndex();

  useEffect(() => {
    // Con StrictMode el efecto corre dos veces; sin este guard se navegaría (y contaría) dos veces.
    if (redirected.current) return;
    redirected.current = true;

    // `replace`: que el "atrás" desde Google no vuelva a esta pantalla y dispare otro escaneo.
    browser.replaceWith(target);
  }, [target]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, FALLBACK_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <LandingShell businessSlug={businessSlug}>
      <Spinner label={t.landing.redirecting} />
      {showFallback && (
        <a href={target} className="text-primary text-center text-base underline underline-offset-4">
          {t.landing.redirectFallback}
        </a>
      )}
    </LandingShell>
  );
}
