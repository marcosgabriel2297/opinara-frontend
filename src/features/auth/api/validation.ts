import { z } from 'zod';

import { t } from '@/i18n';

/**
 * Los límites replican exactamente los DTO del backend (`class-validator`), así el usuario
 * ve el error antes de gastar un request y nunca recibe un 400 genérico por algo evitable.
 */
const email = z
  .email(t.auth.validation.emailInvalid)
  .trim()
  .min(1, t.auth.validation.emailRequired)
  .max(320, t.auth.validation.emailTooLong);

const password = z.string().min(8, t.auth.validation.passwordTooShort).max(128, t.auth.validation.passwordTooLong);

export const loginSchema = z.object({
  email,
  // En login no validamos longitud: si la contraseña es vieja o corta, el error lo da el backend
  // y es siempre el mismo (`WRONG_CREDENTIALS`), sin pistas sobre si el email existe.
  password: z.string().min(1, t.auth.validation.passwordRequired).max(128),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Mismas reglas que el cambio de contraseña: el backend valida las dos igual. */
export const resetPasswordSchema = z.object({ password });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** La primera vez que entra, el usuario cambia la contraseña provisoria que le dio el administrador. */
export const changePasswordSchema = z
  .object({
    // Sin mínimo: solo se compara con la actual, el error lo da el backend.
    currentPassword: z.string().min(1, t.auth.validation.passwordRequired).max(128),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: t.auth.validation.passwordMismatch,
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: t.auth.validation.passwordUnchanged,
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
