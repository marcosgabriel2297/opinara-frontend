import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { createLocation, listLocations, type CreateLocationInput } from './api/locations-api';

export function useLocations(businessUrn: string) {
  return useQuery({
    queryKey: queryKeys.locations(businessUrn),
    queryFn: () => listLocations(businessUrn),
  });
}

export function useCreateLocation(businessUrn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLocationInput) => createLocation(businessUrn, input),
    // `exact`: la clave de las sucursales es prefijo de las de reseñas, y esas no cambian.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.locations(businessUrn), exact: true }),
  });
}
