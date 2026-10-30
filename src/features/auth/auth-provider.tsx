import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isApiError, session } from '@/lib/http';

import * as authApi from './api/auth-api';
import { type LoginValues } from './api/validation';
import { AuthContext, type AuthState } from './auth-context';

/**
 * Dueño del estado de sesión.
 *
 * El usuario no se guarda en TanStack Query a propósito: no hay endpoint para editarlo, las dos
 * respuestas que lo traen (login, refresh) ya lo dejan fresco, y lo único que cambia de él
 * (`mustChangePassword`) lo cambia este mismo provider. Meterlo en la caché sería un cache sin
 * nada que cachear.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Si no hay refresh token guardado, arrancamos anónimos sin tocar la red.
  const [state, setState] = useState<AuthState>(() =>
    session.getRefreshToken() === null ? { status: 'anonymous' } : { status: 'loading' },
  );

  const bootstrapped = useRef(false);
  const loggingOut = useRef(false);

  // Bootstrap: un único POST /auth/refresh, que devuelve tokens y usuario de una.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const refreshToken = session.getRefreshToken();
    if (refreshToken === null) return;

    // Sin bandera de cancelación: el guard de arriba ya garantiza una sola ejecución, y en
    // StrictMode el cleanup del primer montaje cancelaría la única llamada en vuelo —el segundo
    // montaje no la vuelve a lanzar— y el bootstrap quedaría colgado en `loading` para siempre.
    authApi
      .resumeSession(refreshToken)
      .then((response) => {
        authApi.persistSession(response);
        setState({ status: 'authenticated', user: response.user });
      })
      .catch((error: unknown) => {
        session.clear();
        // Una cuenta desactivada (403 USER_INACTIVE) no es lo mismo que un token vencido:
        // el usuario tiene que ver por qué no puede entrar.
        const inactive = isApiError(error) && error.errorCode === 'USER_INACTIVE';
        setState({ status: 'anonymous', ...(inactive ? { reason: 'inactive' as const } : {}) });
      });
  }, []);

  // La sesión también se puede perder en medio del uso: el cliente HTTP limpia el store cuando
  // un refresh falla. Escuchamos ahí en vez de inventar un segundo canal de avisos.
  useEffect(
    () =>
      session.subscribe((snapshot) => {
        if (snapshot.refreshToken !== null || loggingOut.current) return;

        setState((previous) =>
          previous.status === 'authenticated' ? { status: 'anonymous', reason: 'expired' } : previous,
        );
      }),
    [],
  );

  const login = useCallback(async (values: LoginValues) => {
    const response = await authApi.login(values);
    authApi.persistSession(response);
    setState({ status: 'authenticated', user: response.user });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword);
    setState((previous) =>
      previous.status === 'authenticated'
        ? { status: 'authenticated', user: { ...previous.user, mustChangePassword: false } }
        : previous,
    );
  }, []);

  /** Lo local: tokens, estado y caché. Lo comparten los dos cierres de sesión. */
  const clearLocal = useCallback(() => {
    loggingOut.current = true;
    session.clear();
    setState({ status: 'anonymous' });
    // La caché tiene datos del negocio anterior: si entra otro usuario en la misma pestaña,
    // no puede llegar a ver nada del anterior.
    queryClient.clear();
    loggingOut.current = false;
  }, [queryClient]);

  const logout = useCallback(() => {
    const refreshToken = session.getRefreshToken();
    clearLocal();
    // Se revoca en el backend sin hacer esperar. Si falla (sin red), el token igual ya no está en
    // este navegador y vence solo.
    if (refreshToken !== null) {
      authApi.logout(refreshToken).catch(() => undefined);
    }
  }, [clearLocal]);

  const logoutEverywhere = useCallback(async () => {
    // Acá sí se espera: si no se pudo, la sesión de los otros dispositivos sigue abierta y hay que
    // decirlo, no fingir que se cerró.
    await authApi.logoutEverywhere();
    clearLocal();
  }, [clearLocal]);
  const value = useMemo(
    () => ({ state, login, changePassword, logout, logoutEverywhere }),
    [state, login, changePassword, logout, logoutEverywhere],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
