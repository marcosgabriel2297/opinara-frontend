import { useState } from 'react';
import { RouterProvider } from 'react-router';

import { DemoBanner } from '@/components/demo-banner';
import { AuthProvider } from '@/features/auth/auth-provider';

import { Providers } from './providers';
import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);

  return (
    <Providers>
      <DemoBanner />
      {/* AuthProvider adentro de Providers porque usa el QueryClient para limpiar la caché
          al cerrar sesión, y afuera del router porque los guards lo consumen. */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </Providers>
  );
}
