import { StoreIcon } from 'lucide-react';

import { NativeSelect } from '@/components/ui/native-select';
import { t } from '@/i18n';

import { useBusinesses } from '../use-business';

/**
 * El negocio con el que se está trabajando, siempre a la vista: es el que va impreso en los QR.
 * Con uno solo es el nombre; con varios, el selector para cambiar. En la columna lateral ocupa
 * todo el ancho; en la barra del teléfono, lo que entre.
 */
export function BusinessSwitcher() {
  const { businesses, current, select } = useBusinesses();

  if (current === null) return null;

  if (businesses.length < 2) {
    return (
      <span className="lg:bg-card flex min-w-0 items-center gap-2 text-sm font-semibold lg:min-h-12 lg:rounded-lg lg:border lg:px-3">
        <StoreIcon aria-hidden className="text-muted-foreground size-4 shrink-0" />
        <span className="max-w-48 truncate lg:max-w-none">{current.name}</span>
      </span>
    );
  }

  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="sr-only">{t.businesses.switcher.change}</span>
      {/* Con un nombre largo se recorta: nunca empuja la barra más allá de la pantalla. */}
      <NativeSelect
        value={current.urn}
        onChange={(event) => {
          select(event.target.value);
        }}
        className="max-w-52 min-w-0 font-semibold lg:w-full lg:max-w-none [&>select]:lg:h-12"
      >
        {businesses.map((business) => (
          <option key={business.urn} value={business.urn}>
            {business.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
