import { type ReactNode } from 'react';
import { Outlet } from 'react-router';

import { type BusinessFeature, hasFeature } from './api/schemas';
import { useCurrentBusiness } from './use-business';

/**
 * Ruta de layout: lo de adentro solo si el plan del negocio incluye la funcionalidad; si no, el
 * aviso de qué es y cómo sumarla. El backend igual lo corta (`PLAN_FEATURE_NOT_INCLUDED`).
 */
export function RequireFeature({ feature, fallback }: { feature: BusinessFeature; fallback: ReactNode }) {
  const business = useCurrentBusiness();
  return hasFeature(business, feature) ? <Outlet /> : fallback;
}
