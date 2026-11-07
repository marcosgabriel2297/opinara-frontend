import { CheckIcon } from 'lucide-react';

import { t } from '@/i18n';
import { cn } from '@/lib/utils';

interface StampDotsProps {
  stamps: number;
  total: number;
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Los sellos de una tarjeta, como en una de cartón. Los que sobran después de completarla (se
 * acumulan para el próximo premio) no se dibujan: el número ya lo dice.
 */
export function StampDots({ stamps, total, size = 'sm', className }: StampDotsProps) {
  const filled = Math.min(stamps, total);
  const label = t.loyalty.card.progress.replace('{count}', String(stamps)).replace('{total}', String(total));

  return (
    <div role="img" aria-label={label} className={cn('flex flex-wrap gap-1.5', size === 'lg' && 'gap-2.5', className)}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'flex items-center justify-center rounded-full border-2',
            size === 'lg' ? 'size-11' : 'size-5',
            index < filled ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
          )}
        >
          {index < filled && <CheckIcon className={size === 'lg' ? 'size-5' : 'size-3'} strokeWidth={3} />}
        </span>
      ))}
    </div>
  );
}
