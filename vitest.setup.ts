import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@/mocks/server';
import { resetMockState } from '@/mocks/state';

// El primer test de cada archivo paga la compilación de las rutas lazy mientras los otros workers
// corren: con el segundo por defecto de `findBy*`, a veces no llegaba (visto en la suite completa,
// nunca en un archivo solo). Tres segundos alcanzan; una falla real igual falla, solo que más tarde.
configure({ asyncUtilTimeout: 3000 });

// Un handler no declarado es un bug del test, no un fallback silencioso.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockState();
});

afterAll(() => {
  server.close();
});
