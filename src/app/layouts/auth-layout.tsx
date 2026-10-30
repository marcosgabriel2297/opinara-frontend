import { Outlet } from 'react-router';

import { AuthShell } from '@/components/auth-shell';
import { LegalLinks } from '@/features/legal/components/legal-page';

/**
 * Layout de login, contraseñas e invitaciones: una columna centrada, sin nada del dashboard. Abajo, los links
 * legales: Google pide que se vean desde la página de entrada.
 */
export function AuthLayout() {
  return (
    <AuthShell footer={<LegalLinks />}>
      <Outlet />
    </AuthShell>
  );
}
