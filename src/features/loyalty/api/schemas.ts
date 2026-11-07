import { z } from 'zod';

export const loyaltyProgramStatusSchema = z.enum(['ACTIVE', 'PAUSED']);
export type LoyaltyProgramStatus = z.infer<typeof loyaltyProgramStatusSchema>;

/** El programa de una sucursal: "con N sellos, tal premio". Uno por sucursal. */
export const loyaltyProgramSchema = z.object({
  urn: z.string(),
  location: z.object({ urn: z.string(), title: z.string(), isActive: z.boolean() }),
  /** Va en la URL impresa del QR de alta (`/f/{negocio}/{slug}`): no se cambia. */
  slug: z.string(),
  status: loyaltyProgramStatusSchema,
  stampsRequired: z.number(),
  rewardDescription: z.string(),
  terms: z.string().nullable(),
  stampCooldownMinutes: z.number(),
  stats: z.object({ members: z.number(), stamps: z.number(), redemptions: z.number() }),
  /** Lo que codifica el QR de alta. Apunta al frontend. */
  signupUrl: z.string(),
  createdAt: z.string().optional(),
});
export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;
export const loyaltyProgramsSchema = z.array(loyaltyProgramSchema);

/** El cliente como lo ve la caja. */
export const loyaltyMemberSchema = z.object({
  urn: z.string(),
  memberCode: z.string(),
  programUrn: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  stamps: z.number(),
  stampsRequired: z.number(),
  rewardAvailable: z.boolean(),
  totalStamps: z.number(),
  totalRedemptions: z.number(),
  lastStampAt: z.string().nullable(),
  marketing: z.boolean(),
  createdAt: z.string().optional(),
});
export type LoyaltyMember = z.infer<typeof loyaltyMemberSchema>;

/** Lo que devuelve la caja al leer una tarjeta: de qué sucursal es. */
export const loyaltyMemberDetailSchema = loyaltyMemberSchema.extend({
  program: z.object({ urn: z.string(), locationUrn: z.string(), locationTitle: z.string() }),
});
export type LoyaltyMemberDetail = z.infer<typeof loyaltyMemberDetailSchema>;

export const loyaltyMembersPageSchema = z.object({
  items: z.array(loyaltyMemberSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type LoyaltyMembersPage = z.infer<typeof loyaltyMembersPageSchema>;

export const loyaltyEventSchema = z.object({
  /** Vacío si el backend no pudo guardar el historial: el sello vale, pero no se puede deshacer. */
  urn: z.string(),
  type: z.enum(['STAMP', 'REDEMPTION']),
  amount: z.number(),
  createdAt: z.string().optional(),
  undoableUntil: z.string(),
});
export type LoyaltyEvent = z.infer<typeof loyaltyEventSchema>;

export const loyaltyActionResultSchema = z.object({
  member: loyaltyMemberSchema,
  event: loyaltyEventSchema,
  /** Este sello completó la tarjeta. */
  rewardReached: z.boolean(),
});
export type LoyaltyActionResult = z.infer<typeof loyaltyActionResultSchema>;

export const cardLinkSchema = z.object({ cardUrl: z.string(), pngDataUrl: z.string() });
export type CardLink = z.infer<typeof cardLinkSchema>;

const publicBusinessSchema = z.object({
  name: z.string(),
  slug: z.string(),
  logoUpdatedAt: z.string().nullable(),
});

/** Lo que ve el cliente antes de darse de alta. */
export const loyaltySignupSchema = z.object({
  business: publicBusinessSchema,
  location: z.object({ title: z.string() }),
  program: z.object({ rewardDescription: z.string(), stampsRequired: z.number(), terms: z.string().nullable() }),
  termsVersion: z.string(),
});
export type LoyaltySignup = z.infer<typeof loyaltySignupSchema>;

export const registerResultSchema = z.object({ cardToken: z.string() });

/** La tarjeta, para quien tiene el link. */
export const loyaltyCardSchema = z.object({
  business: publicBusinessSchema,
  location: z.object({ title: z.string() }),
  program: z.object({
    rewardDescription: z.string(),
    stampsRequired: z.number(),
    terms: z.string().nullable(),
    /** Si se pueden sumar sellos ahora. Pausado, la tarjeta se ve igual. */
    active: z.boolean(),
  }),
  member: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().nullable(),
    memberCode: z.string(),
    /** El QR que se muestra en la caja. */
    qrPngDataUrl: z.string(),
    stamps: z.number(),
    rewardAvailable: z.boolean(),
    totalRedemptions: z.number(),
    createdAt: z.string().optional(),
  }),
});
export type LoyaltyCard = z.infer<typeof loyaltyCardSchema>;
