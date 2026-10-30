import { Metric } from '@/components/metric';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

import { type Campaign } from '../api/schemas';

/**
 * Los contadores de la campaña.
 *
 * Solo escaneos: cada vez que se abrió el QR, repeticiones incluidas. No son personas distintas
 * ni visitas confirmadas a Google, y el texto no lo sugiere. El backend también devuelve
 * `googleClicks`, pero lo suma junto con `scans` en cada escaneo: mostrarlo aparte sería presentar
 * dos veces el mismo número como si fueran dos mediciones.
 */
export function CampaignStatsRow({
  campaign,
  showHint = false,
  className,
}: {
  campaign: Campaign;
  showHint?: boolean;
  className?: string;
}) {
  const value = campaign.stats.scans.toLocaleString('es-AR');

  // En el detalle es la cifra de la pantalla; en el listado, una columna compacta (`inline`).
  if (showHint) {
    return (
      <Metric
        label={t.campaigns.stats.scans}
        value={value}
        hint={t.campaigns.stats.scansHint}
        tone="brand"
        className={className}
      />
    );
  }

  return (
    <dl className={cn('flex items-baseline gap-2 sm:grid sm:gap-0', className)}>
      <dt className="text-muted-foreground text-xs sm:order-last">{t.campaigns.stats.scans}</dt>
      <dd className="text-brand-strong text-base font-semibold tabular-nums">{value}</dd>
    </dl>
  );
}
