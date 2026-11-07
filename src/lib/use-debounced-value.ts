import { useEffect, useState } from 'react';

/** El valor, pero recién cuando dejó de cambiar por `delay` ms: para no pedir una búsqueda por tecla. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
