import { useEffect } from 'react';

/** Las pantallas del QR no se buscan en Google: se escanean. No queremos que se indexen. */
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    return () => {
      meta.remove();
    };
  }, []);
}
