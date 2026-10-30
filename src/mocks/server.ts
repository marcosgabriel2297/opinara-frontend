import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** MSW para Vitest: los tests nunca tocan la red. */
export const server = setupServer(...handlers);
