import { t } from '@/i18n';
import { exitDemo, isDemo } from '@/lib/demo';

/** Que nunca haya duda de que lo que se ve no es real: arriba de todo, en todas las pantallas. */
export function DemoBanner() {
  if (!isDemo()) return null;

  return (
    <div className="bg-foreground text-background no-imprimir flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-sm">
      <span>{t.demo.banner}</span>
      <button type="button" onClick={exitDemo} className="min-h-9 font-semibold underline underline-offset-4">
        {t.demo.exit}
      </button>
    </div>
  );
}
