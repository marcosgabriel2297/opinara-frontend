import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

interface PaginationProps {
  /** Arranca en 0, como el backend. */
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Mientras llega la página siguiente, para no permitir dos saltos encimados. */
  disabled?: boolean;
}

export function Pagination({ page, limit, total, onPageChange, disabled = false }: PaginationProps) {
  const from = page * limit + 1;
  const to = Math.min((page + 1) * limit, total);
  const isLast = to >= total;

  if (total === 0) return null;

  // Con una sola página, "Anterior" y "Siguiente" serían dos botones siempre deshabilitados: solo
  // queda el conteo.
  if (page === 0 && total <= limit) {
    return (
      <p className="text-muted-foreground text-sm">
        {t.pagination.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>
    );
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label={t.pagination.page.replace('{page}', String(page + 1))}
    >
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t.pagination.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || disabled}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <ChevronLeftIcon aria-hidden />
          {t.pagination.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isLast || disabled}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          {t.pagination.next}
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
