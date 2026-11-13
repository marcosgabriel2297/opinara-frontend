import { type ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { legalEntity } from '@/features/legal/entity';
import { t } from '@/i18n';

interface PlanUpsellProps {
  icon: ReactNode;
  title: string;
  body: string;
  points: readonly string[];
}

/**
 * Una sección que el plan del negocio no incluye: qué es y cómo sumarla, en vez de esconderla o de
 * mostrar un error.
 */
export function PlanUpsell({ icon, title, body, points }: PlanUpsellProps) {
  const [before, after] = t.businesses.planUpsellContact.split('{email}');

  return (
    <Card className="max-w-2xl">
      <CardContent className="grid gap-4">
        <div className="bg-brand-soft text-brand-strong flex size-11 items-center justify-center rounded-lg [&_svg]:size-5">
          {icon}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground">{body}</p>
        <ul className="grid list-disc gap-1.5 pl-5 text-sm">
          {points.map((point) => (
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
