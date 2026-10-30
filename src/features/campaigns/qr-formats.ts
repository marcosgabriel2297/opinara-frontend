/** Los formatos que se pueden imprimir. Todos en A4: es el papel que hay en cualquier local. */
export const QR_FORMATS = ['poster', 'tent', 'stickers'] as const;
export type QrFormat = (typeof QR_FORMATS)[number];
