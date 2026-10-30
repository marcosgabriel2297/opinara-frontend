import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth() se usó fuera de <AuthProvider>');

  return value;
}
