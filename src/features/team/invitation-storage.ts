const KEY = 'opinara.invitation';

/**
 * El token de la invitación, mientras quien la recibe entra o crea su cuenta: el viaje por el login
 * pierde el `#token=` de la URL. Va en `sessionStorage` (no sobrevive a cerrar la pestaña) y se
 * borra al aceptar.
 */
export const invitationStorage = {
  read(): string | null {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  write(token: string): void {
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      // Sin storage, el link sigue sirviendo si lo abre de nuevo desde el mail.
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nada que limpiar.
    }
  },
};
