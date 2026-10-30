import { z } from 'zod';

import { t } from '@/i18n';

/** El formato que acepta `CreateLocationDto` del backend. */
const PLACE_ID = /^[A-Za-z0-9_-]{10,255}$/;

/**
 * Lo que se pega suele ser el link de reseña o de Maps, no el Place ID solo: si trae
 * `placeid=` o `place_id:`, se usa lo que sigue.
 */
export function extractPlaceId(input: string): string {
  const text = input.trim();
  const match = /place_?id[=:]([A-Za-z0-9_-]+)/i.exec(text);
  return match?.[1] ?? text;
}

/** Mismos límites que `CreateLocationDto` del backend. */
export const createLocationSchema = z.object({
  title: z.string().trim().min(2, t.locations.validation.titleTooShort).max(120, t.locations.validation.titleTooLong),
  placeId: z
    .string()
    .transform(extractPlaceId)
    .pipe(
      z.string().min(1, t.locations.validation.placeIdRequired).regex(PLACE_ID, t.locations.validation.placeIdInvalid),
    ),
  address: z.string().trim().max(255, t.locations.validation.addressTooLong),
});

export type CreateLocationFormValues = z.input<typeof createLocationSchema>;
export type CreateLocationValues = z.output<typeof createLocationSchema>;
