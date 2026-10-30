import { repliedValues } from '@/app/paths';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { type Location } from '@/features/locations/api/schemas';
import { t } from '@/i18n';

import { type ReviewSearchState } from '../use-review-search-state';

interface ReviewFiltersProps {
  locations: Location[];
  state: ReviewSearchState;
  /** El estado vacío ofrece limpiar por su cuenta: no repetimos el botón. */
  showClear: boolean;
  onChange: (
    changes: Partial<{ locationUrn: string; rating: number | undefined; hasReply: boolean | undefined }>,
  ) => void;
  onClear: () => void;
}

/**
 * Filtros del listado. En el teléfono, sucursal a todo el ancho y los otros dos de a par; desde
 * `lg` van apilados en la columna lateral, siempre a la vista mientras se recorre la lista.
 */
export function ReviewFilters({ locations, state, showClear, onChange, onClear }: ReviewFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-1">
      <label className="col-span-2 grid gap-1.5 text-sm sm:col-span-1">
        <span className="font-medium">{t.reviews.location}</span>
        <NativeSelect
          className="w-full"
          value={state.locationUrn ?? ''}
          onChange={(event) => {
            onChange({ locationUrn: event.target.value });
          }}
        >
          {locations.map((location) => (
            <option key={location.urn} value={location.urn}>
              {location.title}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t.reviews.filters.rating}</span>
        <NativeSelect
          className="w-full"
          value={state.rating ?? ''}
          onChange={(event) => {
            onChange({ rating: event.target.value === '' ? undefined : Number(event.target.value) });
          }}
        >
          <option value="">{t.reviews.filters.allRatings}</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating === 1 ? t.reviews.filters.oneStar : t.reviews.filters.stars.replace('{count}', String(rating))}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t.reviews.filters.replied}</span>
        <NativeSelect
          className="w-full"
          value={state.hasReply === undefined ? '' : state.hasReply ? repliedValues.yes : repliedValues.no}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ hasReply: value === '' ? undefined : value === repliedValues.yes });
          }}
        >
          <option value="">{t.reviews.filters.allReplied}</option>
          <option value={repliedValues.no}>{t.reviews.filters.withoutReply}</option>
          <option value={repliedValues.yes}>{t.reviews.filters.withReply}</option>
        </NativeSelect>
      </label>

      {showClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="col-span-2 w-fit sm:col-span-3 lg:col-span-1">
          {t.reviews.filters.clear}
        </Button>
      )}
    </div>
  );
}
