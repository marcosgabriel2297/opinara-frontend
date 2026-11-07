import { StampIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { legalEntity } from '@/features/legal/entity';
import { t } from '@/i18n';

/** Si el plan no incluye la tarjeta de sellos: qué es y cómo sumarla, en vez de esconder la sección. */
export function LoyaltyUpsell() {
  const [before, after] = t.loyalty.upsell.contact.split('{email}');

  return (
    <Card className="max-w-2xl">
      <CardContent className="grid gap-4">
        <div className="bg-brand-soft text-brand-strong flex size-11 items-center justify-center rounded-lg">
          <StampIcon aria-hidden className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">{t.loyalty.upsell.title}</h2>
        <p className="text-muted-foreground">{t.loyalty.upsell.body}</p>
        <ul className="grid list-disc gap-1.5 pl-5 text-sm">
          {t.loyalty.upsell.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="text-sm">
          {before}
          <a className="text-primary font-medium underline underline-offset-4" href={`mailto:${legalEntity.contact}`}>
            {legalEntity.contact}
          </a>
          {after}
        </p>
      </CardContent>
    </Card>
  );
}
