import { z } from 'zod';

/** `PublicUser` del backend. */
export const publicUserSchema = z.object({
  urn: z.string(),
  email: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  /** Tiene la contraseña provisoria que le dio el administrador: hasta cambiarla no puede hacer nada más. */
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

/** Respuesta de `login` y `refresh`: las dos devuelven la sesión completa. */
export const sessionSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type SessionResponse = z.infer<typeof sessionSchema>;
