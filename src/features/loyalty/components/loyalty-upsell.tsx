import { StampIcon } from 'lucide-react';

import { PlanUpsell } from '@/features/businesses/components/plan-upsell';
import { t } from '@/i18n';

/** Si el plan no incluye la tarjeta de sellos. */
export function LoyaltyUpsell() {
  return (
    <PlanUpsell
      icon={<StampIcon aria-hidden />}
      title={t.loyalty.upsell.title}
      body={t.loyalty.upsell.body}
      points={t.loyalty.upsell.points}
    />
  );
}
