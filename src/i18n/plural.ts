export interface PluralForms {
  one: string;
  other: string;
}

/**
 * Elige la forma singular o plural y reemplaza `{count}`.
 *
 * Alcanza con `one`/`other`: en español el singular es solo el 1 (el 0 va en plural:
 * "0 sucursales"). Sin esto aparecían cosas como "Tenés 1 sucursales importadas".
 */
export function plural(count: number, forms: PluralForms): string {
  return (count === 1 ? forms.one : forms.other).replace('{count}', count.toLocaleString('es-AR'));
}
