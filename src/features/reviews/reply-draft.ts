/**
 * Borradores de respuesta, uno por reseña, en `sessionStorage`: sobreviven a salir del detalle y
 * volver (o a que el formulario se desmonte), pero no a cerrar la pestaña. La clave lleva la reseña,
 * así que un borrador nunca pisa el de otra.
 */
const key = (reviewUrn: string) => `opinara.reply-draft:${reviewUrn}`;

export function readReplyDraft(reviewUrn: string): string | null {
  try {
    return sessionStorage.getItem(key(reviewUrn));
  } catch {
    return null;
  }
}

export function saveReplyDraft(reviewUrn: string, text: string): void {
  try {
    sessionStorage.setItem(key(reviewUrn), text);
  } catch {
    // Sin almacenamiento el borrador vive solo mientras la pantalla está abierta. Degradado, no roto.
  }
}

export function clearReplyDraft(reviewUrn: string): void {
  try {
    sessionStorage.removeItem(key(reviewUrn));
  } catch {
    // Nada que limpiar.
  }
}
