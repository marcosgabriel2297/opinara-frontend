import { useContext } from 'react';

import { BusinessContext, type BusinessContextValue } from './business-context';

export function useBusinesses(): BusinessContextValue {
  const value = useContext(BusinessContext);
  if (value === null) throw new Error('useBusinesses() se usó fuera de <BusinessProvider>');

  return value;
}

/**
 * El negocio actual, cuando la pantalla ya sabe que existe (está detrás de `RequireBusiness`).
 * Evita un `?.` en cada uso.
 */
export function useCurrentBusiness() {
  const { current } = useBusinesses();
  if (current === null) throw new Error('No hay negocio seleccionado: falta el guard <RequireBusiness>');

  return current;
}
