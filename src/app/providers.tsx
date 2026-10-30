import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/toaster';
import { createQueryClient } from '@/lib/query-client';

export function Providers({ children, client }: { children: ReactNode; client?: QueryClient }) {
  // Un cliente por montaje: los tests pueden inyectar el suyo y no compartir caché entre casos.
  const [queryClient] = useState(() => client ?? createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>{children}</Toaster>
    </QueryClientProvider>
  );
}
