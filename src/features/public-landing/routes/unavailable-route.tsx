import { t } from '@/i18n';

import { LandingShell } from '../components/landing-shell';
import { useNoIndex } from '../hooks/use-no-index';

/**
 * A donde manda el backend cuando el QR no sirve: negocio inexistente, campaña pausada o
 * sucursal sin link de Google. Un solo mensaje para los tres casos, a propósito: quien escanea
 * no tiene por qué saber cuál fue, y distinguirlos filtraría qué negocios existen.
 */
export default function UnavailableRoute() {
  useNoIndex();

  return (
    <LandingShell>
      <h1 className="text-2xl font-semibold">{t.landing.notFoundTitle}</h1>
      <p className="text-muted-foreground text-base">{t.landing.notFoundBody}</p>
    </LandingShell>
  );
}
