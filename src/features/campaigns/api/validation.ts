import { z } from 'zod';

import { t } from '@/i18n';

/** Mismos límites que `CreateCampaignDto` del backend. */
export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, t.campaigns.validation.nameTooShort).max(120, t.campaigns.validation.nameTooLong),
  locationUrn: z.string().min(1, t.campaigns.validation.locationRequired),
  slug: z
    .string()
    .trim()
    .max(60, t.campaigns.validation.slugTooLong)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t.campaigns.validation.slugInvalid)
    .min(2, t.campaigns.validation.slugTooShort)
    .or(z.literal('')),
});

export type CreateCampaignValues = z.infer<typeof createCampaignSchema>;
