import { EmptyState } from '@/components/empty-state';

/**
 * Andamio de la fase 1: cada sección tiene su ruta y su lugar en el layout,
 * el contenido llega en las fases siguientes.
 */
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">{title}</h1>
      <EmptyState title="Todavía no construimos esta pantalla" description={`Llega en la ${phase}.`} />
    </>
  );
}
