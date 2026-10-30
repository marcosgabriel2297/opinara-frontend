import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Outlet } from 'react-router';

import { ErrorState } from '@/components/error-state';
import { FullPageLoader } from '@/components/full-page-loader';
import { queryKeys } from '@/lib/query-keys';

import { listBusinesses } from './api/businesses-api';
import { BusinessContext } from './business-context';
import { readSelectedBusiness, writeSelectedBusiness } from './selected-business-storage';

/**
 * Carga los negocios del usuario una sola vez y decide cuál es el actual.
 *
 * Es una ruta de layout: vive adentro de `RequireAuth`, así que solo corre con sesión.
 */
export function BusinessProvider() {
  const [selectedUrn, setSelectedUrn] = useState<string | null>(readSelectedBusiness);

  const businessesQuery = useQuery({
    queryKey: queryKeys.businesses(),
    queryFn: listBusinesses,
  });

  const select = useCallback((businessUrn: string) => {
    setSelectedUrn(businessUrn);
    writeSelectedBusiness(businessUrn);
  }, []);

  const businesses = useMemo(() => businessesQuery.data ?? [], [businessesQuery.data]);

  const value = useMemo(() => {
    // Si el guardado ya no existe (lo borraron, o es de otra cuenta en la misma máquina),
    // caemos al primero en vez de dejar la app sin negocio.
    const current = businesses.find((business) => business.urn === selectedUrn) ?? businesses[0] ?? null;

    return { businesses, current, select };
  }, [businesses, selectedUrn, select]);

  if (businessesQuery.isPending) return <FullPageLoader />;

  if (businessesQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <ErrorState error={businessesQuery.error} onRetry={() => void businessesQuery.refetch()} />
      </div>
    );
  }

  return (
    <BusinessContext value={value}>
      <Outlet />
    </BusinessContext>
  );
}
