import { Navigate, Outlet, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { FullPageLoader } from '@/components/full-page-loader';
import { t } from '@/i18n';

import { LOGIN_PATH, redirectTargetFrom } from './redirect-target';
import { useAuth } from './use-auth';

/**
 * Guard de las rutas privadas. Mientras el bootstrap resuelve no decide nada: si redirigiera
 * durante el `loading`, cualquier F5 dentro del dashboard rebotaría al login aunque la sesión
 * fuera válida.
 */
export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <FullPageLoader label={t.auth.resuming} />;

  const from = `${location.pathname}${location.search}`;

  if (state.status === 'anonymous') {
    // Guardamos a dónde quería ir para devolverlo ahí después de entrar.
    return <Navigate to={LOGIN_PATH} state={{ from }} replace />;
  }

  // Con la contraseña provisoria del alta el backend rechaza todo lo demás: primero, cambiarla.
  if (state.user.mustChangePassword && location.pathname !== paths.changePassword) {
    return <Navigate to={paths.changePassword} state={{ from }} replace />;
  }

  return <Outlet />;
}

/**
 * Login y recuperar contraseña: si ya hay sesión, no tiene sentido mostrarlos.
 *
 * Manda al mismo destino que calcula el formulario después de entrar. No es redundante: cuando
 * el login resuelve, este guard y el `navigate()` del formulario compiten por redirigir, y si
 * cada uno eligiera un destino distinto el resultado dependería de quién gana la carrera.
 */
export function RequireAnonymous() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <FullPageLoader label={t.auth.resuming} />;
  if (state.status === 'authenticated') return <Navigate to={redirectTargetFrom(location.state)} replace />;

  return <Outlet />;
}
