import { z } from 'zod';

import { t } from '@/i18n';

const v = t.loyalty.validation;

/** Mismos límites que los DTO del backend. */
const reward = z.string().trim().min(2, v.rewardTooShort).max(80, v.rewardTooLong);
const stamps = z.number({ error: v.stampsRange }).int(v.stampsRange).min(2, v.stampsRange).max(20, v.stampsRange);
const terms = z.string().trim().max(500, v.termsTooLong);
const cooldown = z
  .number({ error: v.cooldownRange })
  .int(v.cooldownRange)
  .min(1, v.cooldownRange)
  .max(1440, v.cooldownRange);

export const createProgramSchema = z.object({
  locationUrn: z.string().min(1, v.locationRequired),
  rewardDescription: reward,
  stampsRequired: stamps,
  terms,
});
export type CreateProgramValues = z.infer<typeof createProgramSchema>;

export const editProgramSchema = z.object({
  rewardDescription: reward,
  stampsRequired: stamps,
  terms,
  stampCooldownMinutes: cooldown,
});
export type EditProgramValues = z.infer<typeof editProgramSchema>;

const s = t.loyalty.signup.validation;

/** El celular lo normaliza el backend (con o sin 0, 15 o +54): acá solo se pide que haya algo. */
export const signupSchema = z.object({
  name: z.string().trim().min(2, s.nameTooShort).max(80, s.nameTooLong),
  phone: z.string().trim().min(6, s.phoneRequired).max(30, s.phoneRequired),
  email: z.email(s.emailInvalid).max(254, s.emailInvalid).or(z.literal('')),
  acceptTerms: z.boolean().refine((value) => value, s.acceptRequired),
  marketing: z.boolean(),
  /** El campo trampa (ver `signup-route.tsx`). */
  trap: z.string(),
});
export type SignupValues = z.infer<typeof signupSchema>;
