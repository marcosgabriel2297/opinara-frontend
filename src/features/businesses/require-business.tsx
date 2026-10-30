import { Navigate, Outlet } from 'react-router';

import { paths } from '@/app/paths';

import { useBusinesses } from './use-business';

/** Sin negocio no hay nada que mostrar en el dashboard: al onboarding. */
export function RequireBusiness() {
  const { current } = useBusinesses();

  if (current === null) return <Navigate to={paths.onboarding} replace />;

  return <Outlet />;
}
