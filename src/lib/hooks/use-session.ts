import { useSyncExternalStore } from 'react';

import { session, type SessionSnapshot } from '@/lib/http';

/** Estado de sesión reactivo. La fuente de verdad es el store del cliente HTTP, no React. */
export function useSession(): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
