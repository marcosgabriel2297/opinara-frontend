import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/inter-tight/wght.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';

import { App } from './app/app';
import { isDemo } from './lib/demo';
import { session } from './lib/http';
import { watchStaleChunks } from './lib/stale-chunks';
import './styles/index.css';

/**
 * MSW en desarrollo con el flag puesto, o en la demo (ver `lib/demo.ts`). En dev normal queremos
 * pegarle al backend de verdad. El import es dinámico: el bundle principal no arrastra la librería
 * (son ~600 kB) y solo la baja quien entra a la demo.
 */
async function enableBrowserMocks(): Promise<void> {
  const devMocks = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true';
  const demo = isDemo();
  if (!devMocks && !demo) return;

  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: demo });

  // En la demo se entra ya con sesión: la que aceptan los mocks.
  if (demo) {
    const { mockSession } = await import('./mocks/fixtures');
    session.set({ accessToken: mockSession.accessToken, refreshToken: mockSession.refreshToken });
  }
}

async function bootstrap(): Promise<void> {
  watchStaleChunks();
  await enableBrowserMocks();

  const container = document.getElementById('root');
  if (container === null) throw new Error('No se encontró el nodo #root');

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
