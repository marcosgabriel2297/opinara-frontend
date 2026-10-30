import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/http';
import { queryKeys } from '@/lib/query-keys';

import * as googleApi from './api/google-api';
import { type GoogleConnection } from './api/schemas';

/**
 * Estado de la conexión. "No hay conexión" no es un error de la app: el backend lo dice con un
 * 404 `GOOGLE_CONNECTION_NOT_FOUND` y acá se traduce a `null`, así la pantalla distingue
 * "todavía no conectó" de "se rompió algo".
 */
export function useGoogleConnection(businessUrn: string) {
  return useQuery<GoogleConnection | null>({
    queryKey: queryKeys.googleConnection(businessUrn),
    queryFn: async () => {
      try {
        return await googleApi.getConnection(businessUrn);
      } catch (error) {
        if (isApiError(error) && error.is('GOOGLE_CONNECTION_NOT_FOUND')) return null;
        throw error;
      }
    },
  });
}

export function useGoogleAccounts(businessUrn: string, enabled: boolean) {
  const revalidate = useRevalidateConnectionOnRevoked(businessUrn);

  return useQuery({
    queryKey: queryKeys.googleAccounts(businessUrn),
    queryFn: () => revalidate(() => googleApi.listAccounts(businessUrn)),
    enabled,
  });
}

/**
 * `GET /google/connection` puede decir ACTIVE mientras Google ya rechaza el token: el backend
 * marca la conexión como revocada recién cuando la usa. Así que cuando una llamada a Google
 * falla por eso, refrescamos el estado para que el cartel y la pantalla de estado se enteren.
 */
export function useRevalidateConnectionOnRevoked(businessUrn: string) {
  const queryClient = useQueryClient();

  return async <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      if (isApiError(error) && error.is('GOOGLE_CONNECTION_REVOKED')) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.googleConnection(businessUrn) });
      }

      throw error;
    }
  };
}

export function useAvailableLocations(businessUrn: string, accountName: string | null) {
  const revalidate = useRevalidateConnectionOnRevoked(businessUrn);

  return useQuery({
    queryKey: queryKeys.googleLocations(businessUrn, accountName ?? ''),
    queryFn: () => {
      // `enabled` ya lo garantiza; el chequeo es para no castear el tipo.
      if (accountName === null) throw new Error('Falta la cuenta de Google');

      return revalidate(() => googleApi.listAvailableLocations(businessUrn, accountName));
    },
    enabled: accountName !== null,
  });
}

export function useStartConnection(businessUrn: string) {
  return useMutation({ mutationFn: () => googleApi.startConnection(businessUrn) });
}

export function useDisconnect(businessUrn: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleApi.disconnect(businessUrn),
    onSuccess: async () => {
      // Cae la conexión y con ella lo que dependía de Google.
      await queryClient.invalidateQueries({ queryKey: ['businesses', businessUrn, 'google'] });
    },
  });
}

export function useImportLocations(businessUrn: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountName: string; locationNames: string[] }) =>
      googleApi.importLocations(businessUrn, input),
    onSuccess: async () => {
      // Las sucursales importadas cambian tanto el listado de Google (`imported`) como el nuestro.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['businesses', businessUrn, 'google', 'locations'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.locations(businessUrn) }),
      ]);
    },
  });
}
