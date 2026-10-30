/** Fechas siempre en es-AR. Devuelve `undefined` si no hay fecha, para que la UI decida qué poner. */
export function formatDate(iso: string | undefined, options?: Intl.DateTimeFormatOptions): string | undefined {
  if (iso === undefined) return undefined;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat('es-AR', options ?? { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(iso: string | undefined): string | undefined {
  return formatDate(iso, { dateStyle: 'medium', timeStyle: 'short' });
}

const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

/** "hoy", "ayer", "hace 5 días", "hace 3 meses": para cuánto hace que alguien espera. */
export function formatRelativeDays(iso: string | undefined, now: Date = new Date()): string | undefined {
  if (iso === undefined) return undefined;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return undefined;

  const days = Math.round((startOfDay(now) - startOfDay(new Date(time))) / (24 * 60 * 60 * 1000));
  if (days < 30) return relative.format(-days, 'day');
  if (days < 365) return relative.format(-Math.round(days / 30), 'month');
  return relative.format(-Math.round(days / 365), 'year');
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
