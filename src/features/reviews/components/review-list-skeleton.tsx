import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/i18n';

/**
 * El lugar de la lista mientras carga, con la forma de las filas: la pantalla no salta al llegar.
 * El anuncio para lectores de pantalla lo hace el `Spinner` (oculto a la vista).
 */
export function ReviewListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="gap-0 py-0">
      <span className="sr-only">
        <Spinner label={t.common.loading} />
      </span>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
            <div className="grid gap-2 sm:pl-12">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-2/3 max-w-sm" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
