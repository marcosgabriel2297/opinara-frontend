import { RefreshCwIcon } from 'lucide-react';

import { type Location } from '@/features/locations/api/schemas';
import { t } from '@/i18n';
import { formatDateTime } from '@/lib/format';

/**
 * Reemplaza al botón "Sincronizar": el backend trae las reseñas solo (cron cada 15 minutos y una
 * pasada completa por noche), así que no hay nada que el dueño tenga que apretar. Alcanza con
 * decirle que están al día y desde cuándo.
 *
 * Las sucursales cargadas a mano no se sincronizan: a esas no se les promete nada.
 */
export function ReviewsFreshness({ location }: { location: Location | undefined }) {
  if (location === undefined || location.source === 'MANUAL') return null;

  const lastSync = formatDateTime(location.lastReviewSyncAt);

  return (
    <p className="text-muted-foreground flex gap-2 text-sm">
      <RefreshCwIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        {t.reviews.freshness.auto}{' '}
        {lastSync === undefined
          ? t.reviews.freshness.firstSync
          : t.reviews.freshness.lastSync.replace('{date}', lastSync)}
      </span>
    </p>
  );
}
