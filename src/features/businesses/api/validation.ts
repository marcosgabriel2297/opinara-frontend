import { z } from 'zod';

import { t } from '@/i18n';

/** Mismos límites que `CreateBusinessDto` del backend. */
export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, t.businesses.validation.nameTooShort).max(120, t.businesses.validation.nameTooLong),
  slug: z
    .string()
    .trim()
    .max(60, t.businesses.validation.slugTooLong)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t.businesses.validation.slugInvalid)
    .min(2, t.businesses.validation.slugTooShort)
    .or(z.literal('')),
  timezone: z.string().max(64),
});

export type CreateBusinessValues = z.infer<typeof createBusinessSchema>;
