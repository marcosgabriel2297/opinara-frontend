import { Loader2Icon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Spinner({ className, label }: { className?: string | undefined; label?: string | undefined }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2Icon aria-hidden className={cn('size-4 animate-spin', className)} />
      <span className={label === undefined ? 'sr-only' : 'text-muted-foreground text-sm'}>{label ?? 'Cargando'}</span>
    </span>
  );
}
