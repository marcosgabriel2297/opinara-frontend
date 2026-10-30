import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type Business } from '@/features/businesses/api/schemas';
import { t } from '@/i18n';

import { canManageLocations } from '../permissions';
import { useLocations } from '../queries';

/** Las sucursales del negocio, de dónde vienen, y el alta manual para quien puede hacerla. */
export function LocationsSettings({ business }: { business: Business }) {
  const locationsQuery = useLocations(business.urn);
  const locations = locationsQuery.data ?? [];
  const hasManual = locations.some((location) => location.source === 'MANUAL');

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.locations.title}</h2>
        </CardTitle>
        <CardDescription>{t.locations.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {locationsQuery.isPending && <Skeleton className="h-12 w-full" />}
        {locationsQuery.isError && (
          <ErrorState error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />
        )}

        {locationsQuery.isSuccess &&
          (locations.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.locations.empty}</p>
          ) : (
            <ul className="divide-y border-y">
              {locations.map((location) => (
                <li key={location.urn} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                  <div className="grid min-w-0 gap-0.5">
                    <span className="font-medium">{location.title}</span>
                    {location.address !== undefined && (
                      <span className="text-muted-foreground truncate text-sm">{location.address}</span>
                    )}
                  </div>
                  {/* Las anteriores al alta manual no traen `source`: son todas de Google. */}
                  <Badge variant="outline" dot={false}>
                    {t.locations.source[location.source ?? 'GOOGLE']}
                  </Badge>
                </li>
              ))}
            </ul>
          ))}

        {hasManual && <p className="text-muted-foreground text-sm">{t.locations.manualHint}</p>}

        {canManageLocations(business.role) && (
          <Button asChild variant="outline" className="w-fit">
            <Link viewTransition to={paths.newLocation}>
              <PlusIcon aria-hidden />
              {t.locations.add}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
