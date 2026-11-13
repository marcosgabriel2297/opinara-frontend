import { MessageSquareIcon } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { PlanUpsell } from '@/features/businesses/components/plan-upsell';
import { t } from '@/i18n';

/** Reseñas y campañas de QR, para un negocio cuyo plan no las incluye (por ejemplo, solo fidelización). */
export function ReviewsUpsell() {
  return (
    <>
      <PageHeader title={t.reviews.upsell.pageTitle} />
      <PlanUpsell
        icon={<MessageSquareIcon aria-hidden />}
        title={t.reviews.upsell.title}
        body={t.reviews.upsell.body}
        points={t.reviews.upsell.points}
      />
    </>
  );
}
