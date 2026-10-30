import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/http';

/** Un 4xx no se arregla reintentando: solo se reintenta lo que puede ser transitorio. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!isApiError(error)) return false;

  return error.statusCode === 0 || error.statusCode >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
