import { z } from 'zod';

import { businessRoleSchema, businessSchema } from '@/features/businesses/api/schemas';

export const memberSchema = z.object({
  urn: z.string(),
  role: businessRoleSchema,
  joinedAt: z.string().optional(),
  user: z.object({ urn: z.string(), name: z.string(), email: z.string() }),
});

export type Member = z.infer<typeof memberSchema>;

export const pendingInvitationSchema = z.object({
  urn: z.string(),
  email: z.string(),
  role: businessRoleSchema,
  expiresAt: z.string(),
  createdAt: z.string().optional(),
});

export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;

export const teamSchema = z.object({
  members: z.array(memberSchema),
  /** Vacío para MEMBER: las invitaciones las ven quienes invitan. */
  invitations: z.array(pendingInvitationSchema),
});

export type Team = z.infer<typeof teamSchema>;

export const createdInvitationSchema = z.object({
  invitation: pendingInvitationSchema,
  /** El link para pasarle a mano (WhatsApp) si el mail no llega. */
  inviteUrl: z.string(),
});

export type CreatedInvitation = z.infer<typeof createdInvitationSchema>;

export const invitationLookupSchema = z.object({
  status: z.enum(['PENDING', 'EXPIRED', 'ACCEPTED', 'REVOKED']),
  email: z.string(),
  role: businessRoleSchema,
  businessName: z.string(),
  invitedByName: z.string().nullable(),
  accountExists: z.boolean(),
});

export type InvitationLookup = z.infer<typeof invitationLookupSchema>;

export const acceptedInvitationSchema = businessSchema;

/** Los roles con los que se invita: OWNER hay uno solo. */
export const INVITABLE_ROLES = ['ADMIN', 'MEMBER'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];
