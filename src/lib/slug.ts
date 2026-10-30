/**
 * Deriva un slug como lo hace el backend, **solo para la vista previa**. El slug definitivo lo
 * decide el backend (y puede rechazarlo con `SLUG_NOT_DERIVABLE`): acá no se manda nada derivado,
 * para no tener dos verdades sobre la misma regla.
 */
export function slugPreview(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
