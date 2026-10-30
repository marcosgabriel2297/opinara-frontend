import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { type ScansByWeek } from '../api/schemas';

const weekLabel = (week: string) =>
  formatDate(`${week}T12:00:00Z`, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Escaneos por semana: columnas finas de un solo color (es una sola serie: el título la nombra, no
 * hace falta leyenda), redondeadas arriba y apoyadas en una línea de base. El valor de la semana
 * actual va sobre su columna; el resto, al pasar el mouse. Para lectores de pantalla, la misma
 * información en una tabla.
 */
export function ScanChart({ data, className }: { data: ScansByWeek; className?: string }) {
  const max = Math.max(1, ...data.weeks.map((week) => week.scans));
  const lastIndex = data.weeks.length - 1;
  const first = data.weeks[0];
  const last = data.weeks[lastIndex];

  // Sin ningún escaneo con fecha, doce columnas vacías dirían "nadie escaneó", y no es así: los
  // escaneos anteriores al registro por fecha están en el total. Se explica en vez de dibujar.
  if (data.trackedSince === null) {
    return <p className={cn('text-muted-foreground text-sm', className)}>{t.campaigns.chart.noData}</p>;
  }

  return (
    <figure className={cn('grid gap-2', className)}>
      <div aria-hidden className="border-input/70 flex h-28 items-end gap-0.5 border-b">
        {data.weeks.map((week, index) => {
          // El valor y el tooltip van justo sobre la columna, no sobre el gráfico entero.
          const aboveBar = { bottom: `calc(${String((week.scans / max) * 100)}% + 0.25rem)` };
          return (
            <div key={week.week} className="group relative flex h-full flex-1 items-end justify-center">
              {index === lastIndex && week.scans > 0 && (
                <span
                  className="text-foreground absolute text-xs font-semibold tabular-nums group-hover:invisible"
                  style={aboveBar}
                >
                  {week.scans.toLocaleString('es-AR')}
                </span>
              )}
              <div
                className={cn(
                  'w-full max-w-6 rounded-t-[4px]',
                  week.scans === 0
                    ? 'bg-border h-px'
                    : index === lastIndex
                      ? 'bg-primary'
                      : 'bg-primary/55 group-hover:bg-primary',
                )}
                style={week.scans === 0 ? undefined : { height: `${String(Math.max(4, (week.scans / max) * 100))}%` }}
              />
              {/* Al pasar el mouse: la semana y su valor. */}
              <span
                className={cn(
                  'bg-foreground text-background pointer-events-none absolute z-10 hidden rounded-md px-2 py-1 text-xs whitespace-nowrap group-hover:block',
                  // En los bordes, el tooltip se abre hacia adentro para no cortarse.
                  index < 2 && 'left-0',
                  index > lastIndex - 2 && 'right-0',
                )}
                style={aboveBar}
              >
                {t.campaigns.chart.weekOf.replace('{date}', weekLabel(week.week) ?? week.week)}:{' '}
                <strong className="font-semibold tabular-nums">{week.scans.toLocaleString('es-AR')}</strong>
              </span>
            </div>
          );
        })}
      </div>

      {first !== undefined && last !== undefined && (
        <div aria-hidden className="text-muted-foreground flex justify-between text-xs">
          <span>{weekLabel(first.week)}</span>
          <span>{t.campaigns.chart.thisWeek}</span>
        </div>
      )}

      <figcaption className="text-muted-foreground text-xs">
        {t.campaigns.chart.since.replace('{date}', formatDate(data.trackedSince) ?? '')}
      </figcaption>

      <table className="sr-only">
        <caption>{t.campaigns.chart.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.campaigns.chart.week}</th>
            <th scope="col">{t.campaigns.stats.scans}</th>
          </tr>
        </thead>
        <tbody>
          {data.weeks.map((week) => (
            <tr key={week.week}>
              <td>{t.campaigns.chart.weekOf.replace('{date}', weekLabel(week.week) ?? week.week)}</td>
              <td>{week.scans}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
