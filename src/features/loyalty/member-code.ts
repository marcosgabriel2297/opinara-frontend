/**
 * El código de la tarjeta: 6 caracteres sin 0/O ni 1/I. El QR de la tarjeta lo lleva con prefijo
 * (`opinara-card:K3F9QX`), para que la caja no confunda otro QR —como el de las reseñas— con una tarjeta.
 */
const QR_CONTENT = /^opinara-card:([A-HJ-NP-Z2-9]{6})$/i;

/** De lo que leyó la cámara, el código; `null` si no es el QR de una tarjeta. */
export function memberCodeFromQr(content: string): string | null {
  return QR_CONTENT.exec(content.trim())?.[1]?.toUpperCase() ?? null;
}

/** Para leerlo o dictarlo: `K3F 9QX`. */
export function formatMemberCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
