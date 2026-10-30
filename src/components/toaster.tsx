import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { t } from '@/i18n';

import { ToastContext, type ToastApi, type ToastOptions, type UndoableOptions } from './toast-context';

const DEFAULT_DURATION = 6000;

interface ActiveToast extends ToastOptions {
  id: number;
}

/**
 * Un aviso a la vez, abajo y al centro (arriba de la barra de navegación del teléfono). La región
 * `aria-live` está siempre montada: si apareciera junto con el texto, un lector de pantalla no lo
 * anunciaría. Sin `role="status"`: el rol lo tienen los avisos de cada pantalla, y una región vacía
 * con ese rol sería un "estado" fantasma más.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // La acción pendiente de un `undoable`: si llega otro aviso, la anterior se ejecuta ya.
  const pending = useRef<(() => void) | null>(null);
  const nextId = useRef(0);

  const flushPending = useCallback(() => {
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      window.clearTimeout(timer.current);
      nextId.current += 1;
      setToast({ ...options, id: nextId.current });
      timer.current = window.setTimeout(() => {
        flushPending();
        setToast(null);
      }, options.duration ?? DEFAULT_DURATION);
    },
    [flushPending],
  );

  const undoable = useCallback(
    ({ message, run, onUndo, delay }: UndoableOptions) => {
      flushPending();
      pending.current = run;
      show({
        message,
        duration: delay,
        action: {
          label: t.common.undo,
          onClick: () => {
            pending.current = null;
            onUndo?.();
          },
        },
      });
    },
    [flushPending, show],
  );

  // Al desmontar (cerrar sesión, salir de la app) lo pendiente se ejecuta: el aviso ya lo dio por hecho.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      flushPending();
    },
    [flushPending],
  );

  const api = useMemo<ToastApi>(() => ({ show, undoable }), [show, undoable]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6"
      >
        {toast !== null && (
          <div
            key={toast.id}
            className="bg-foreground text-background pointer-events-auto flex max-w-md items-center gap-4 rounded-lg py-2.5 pr-2.5 pl-4 text-sm shadow-[0_8px_24px_-12px_rgb(23_32_30/0.5)]"
          >
            <span>{toast.message}</span>
            {toast.action !== undefined && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  window.clearTimeout(timer.current);
                  setToast(null);
                }}
                className="min-h-10 shrink-0 rounded-md bg-white/12 px-3.5 font-semibold hover:bg-white/20"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
