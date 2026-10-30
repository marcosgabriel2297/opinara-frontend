import { createContext } from 'react';

import { type PublicUser } from './api/schemas';
import { type LoginValues } from './api/validation';

/** Por qué el usuario está anónimo. Cambia lo que ve en la pantalla de login. */
export type AnonymousReason = 'expired' | 'inactive';

export type AuthState =
  /** Hay un refresh token guardado y lo estamos canjeando. */
  | { status: 'loading' }
  | { status: 'authenticated'; user: PublicUser }
  | { status: 'anonymous'; reason?: AnonymousReason };

export interface AuthContextValue {
  state: AuthState;
  login: (values: LoginValues) => Promise<void>;
  /** Reemplaza la contraseña provisoria del alta; la sesión de este dispositivo sigue abierta. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Sale en el acto; la revocación en el backend va detrás, sin hacer esperar. */
  logout: () => void;
  /** Cierra la sesión en todos los dispositivos (este incluido). */
  logoutEverywhere: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
