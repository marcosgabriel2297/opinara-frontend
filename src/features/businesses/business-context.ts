import { createContext } from 'react';

import { type Business } from './api/schemas';

export interface BusinessContextValue {
  /** Todos los negocios del usuario. Sin paginación: el backend devuelve el array completo. */
  businesses: Business[];
  /** El negocio con el que está trabajando. `null` solo mientras no tiene ninguno. */
  current: Business | null;
  select: (businessUrn: string) => void;
}

export const BusinessContext = createContext<BusinessContextValue | null>(null);
