import { createContext, useContext } from 'react';

export interface ToastOptions {
  message: string;
  /** Una sola acción, la que deshace lo que se acaba de hacer. */
  action?: { label: string; onClick: () => void };
  /** Cuánto queda a la vista, en ms. */
  duration?: number | undefined;
}

export interface UndoableOptions {
  /** Lo que va a pasar, dicho en pasado: "Borramos la respuesta." */
  message: string;
  /** Lo que se ejecuta si nadie deshace a tiempo. */
  run: () => void;
  /** Avisa que se deshizo (por ejemplo, para devolver el foco). */
  onUndo?: () => void;
  delay?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  /**
   * Deshacer en vez de confirmar: la acción se anuncia como hecha y recién se ejecuta al cerrarse
   * el aviso. Si se toca "Deshacer" antes, no llega a pasar nada.
   */
  undoable: (options: UndoableOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error('useToast fuera de <Toaster>');
  return api;
}
