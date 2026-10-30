import { Fragment, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { Wordmark } from '@/components/brand-mark';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

import { legalEntity } from '../entity';

/**
 * Las páginas legales: públicas, con o sin sesión, porque Google las revisa (y las enlaza desde
 * la pantalla de consentimiento) y cualquiera tiene que poder leerlas antes de crear una cuenta.
 *
 * Una columna de lectura, sin nada del dashboard. Los estilos del texto van acá, una sola vez,
 * para que el contenido sea JSX plano (`h2`, `p`, `ul`, `table`).
 */
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${t.app.name}`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <header className="mx-auto mb-10 w-full max-w-2xl">
        <Link to={paths.home} className="inline-flex w-fit">
          <Wordmark />
        </Link>
      </header>

      <main
        className={[
          'mx-auto w-full max-w-2xl flex-1 text-base leading-relaxed',
          '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-6 [&_h2]:text-xl [&_h2]:font-semibold',
          '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold',
          '[&_p]:my-3 [&_ul]:my-3 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-6',
          '[&_a]:text-brand-strong [&_a]:underline [&_a]:underline-offset-4',
          '[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-sm [&_code]:break-all',
        ].join(' ')}
      >
        <h1 className="font-display text-3xl font-medium tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {t.legal.updatedAt} {updatedAt}
        </p>
        {children}
      </main>

      <footer className="text-muted-foreground mx-auto mt-16 w-full max-w-2xl border-t pt-6 text-sm">
        <LegalLinks />
      </footer>
    </div>
  );
}

/**
 * Tabla de dos o tres columnas. En el teléfono cada fila pasa a ser un bloque (la primera celda,
 * en negrita, hace de título): tres columnas de texto legal en 360px cortan las palabras al medio.
 * Desde la tercera columna, la celda lleva su encabezado delante para no perder qué es.
 */
export function LegalTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-4 rounded-lg border">
      <table className="w-full text-left text-sm max-sm:block">
        <thead className="bg-muted/50 max-sm:hidden">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y max-sm:block">
          {rows.map((row, index) => (
            <tr key={index} className="align-top max-sm:block max-sm:py-2">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  data-label={cellIndex >= 2 && head[cellIndex] !== undefined ? `${head[cellIndex]}: ` : undefined}
                  className={cn(
                    'px-3 py-2 max-sm:block max-sm:py-0.5',
                    cellIndex === 0 && 'max-sm:font-semibold',
                    cellIndex >= 2 && 'max-sm:text-muted-foreground max-sm:before:content-[attr(data-label)]',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Los titulares en una frase: "A, CUIT …, con domicilio en …, y B, CUIT …, con domicilio en …". */
export function LegalHolders() {
  const { holders } = legalEntity;
  return holders.map((holder, index) => (
    <Fragment key={holder.cuit}>
      {index > 0 && (index === holders.length - 1 ? ', y ' : ', ')}
      <strong>{holder.name}</strong>, CUIT <strong className="whitespace-nowrap">{holder.cuit}</strong>, con domicilio
      en <strong>{holder.address}</strong>
    </Fragment>
  ));
}

/** Los dos documentos, juntos: el pie de estas páginas y de las pantallas de entrada. */
export function LegalLinks() {
  return (
    <nav aria-label={t.legal.nav} className="flex flex-wrap justify-center gap-x-4 gap-y-1">
      <Link to={paths.terms} className="hover:text-foreground underline-offset-4 hover:underline">
        {t.legal.terms}
      </Link>
      <Link to={paths.privacy} className="hover:text-foreground underline-offset-4 hover:underline">
        {t.legal.privacy}
      </Link>
      <a href={`mailto:${legalEntity.contact}`} className="hover:text-foreground underline-offset-4 hover:underline">
        {legalEntity.contact}
      </a>
    </nav>
  );
}
