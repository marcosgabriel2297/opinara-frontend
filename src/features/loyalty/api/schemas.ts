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
  /** La plantilla del recordatorio por WhatsApp que se usa (la propia o la recomendada). */
  reminderMessage: z.string(),
  reminderMessageIsDefault: z.boolean(),
  /** Días sin venir para recomendar el "te extrañamos", y su plantilla. */
  inactiveDays: z.number(),
  inactiveReminderMessage: z.string(),
  inactiveReminderMessageIsDefault: z.boolean(),
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
  /**
   * Desde cuándo se puede sumar el próximo sello (lo calcula el backend con el tiempo mínimo del
   * programa). `null` si nunca recibió uno o se deshizo; si ya pasó, se puede sellar.
   */
  nextStampAt: z.string().nullable(),
  /** Cuándo se abrió WhatsApp para mandarle el último recordatorio. */
  lastReminderAt: z.string().nullable(),
  /** Si pidió no recibir recordatorios, quién los apagó: él desde su tarjeta o el local. */
  remindersOptOutBy: z.enum(['CLIENT', 'BUSINESS']).nullable(),
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
  type: z.enum(['STAMP', 'REDEMPTION', 'STAMP_REMOVAL']),
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

/** Un recordatorio recomendado: el mensaje ya viene armado, con el link de la tarjeta al final. */
export const loyaltyReminderSchema = z.object({
  member: loyaltyMemberSchema,
  program: z.object({ urn: z.string(), locationTitle: z.string() }),
  /** Por qué se recomienda: le falta poco, o hace un tiempo que no viene. */
  reason: z.enum(['NEAR_REWARD', 'INACTIVE']),
  missingStamps: z.number(),
  /** Días desde su última visita: el último sello o, si no tiene, el alta. */
  daysSinceVisit: z.number(),
  message: z.string(),
});
export type LoyaltyReminder = z.infer<typeof loyaltyReminderSchema>;
export type LoyaltyReminderReason = LoyaltyReminder['reason'];

export const loyaltyRemindersPageSchema = z.object({
  items: z.array(loyaltyReminderSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type LoyaltyRemindersPage = z.infer<typeof loyaltyRemindersPageSchema>;

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
    /** Si acepta los recordatorios del local por WhatsApp. */
    remindersEnabled: z.boolean(),
    createdAt: z.string().optional(),
  }),
});
export type LoyaltyCard = z.infer<typeof loyaltyCardSchema>;
