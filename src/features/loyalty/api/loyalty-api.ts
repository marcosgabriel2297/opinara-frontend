import { generatedQrSchema, type GeneratedQr } from '@/features/campaigns/api/schemas';
import { api } from '@/lib/http';

import {
  cardLinkSchema,
  loyaltyActionResultSchema,
  loyaltyMemberDetailSchema,
  loyaltyMemberSchema,
  loyaltyMembersPageSchema,
  loyaltyProgramSchema,
  loyaltyProgramsSchema,
  type CardLink,
  type LoyaltyActionResult,
  type LoyaltyMember,
  type LoyaltyMemberDetail,
  type LoyaltyMembersPage,
  type LoyaltyProgram,
  type LoyaltyProgramStatus,
} from './schemas';

const enc = encodeURIComponent;
const base = (businessUrn: string) => `/businesses/${enc(businessUrn)}/loyalty`;
const program = (businessUrn: string, programUrn: string) => `${base(businessUrn)}/programs/${enc(programUrn)}`;

export function listPrograms(businessUrn: string): Promise<LoyaltyProgram[]> {
  return api.get(`${base(businessUrn)}/programs`, { schema: loyaltyProgramsSchema });
}

export function getProgram(businessUrn: string, programUrn: string): Promise<LoyaltyProgram> {
  return api.get(program(businessUrn, programUrn), { schema: loyaltyProgramSchema });
}

export interface CreateProgramInput {
  locationUrn: string;
  rewardDescription: string;
  stampsRequired?: number;
  terms?: string;
}

export function createProgram(businessUrn: string, input: CreateProgramInput): Promise<LoyaltyProgram> {
  return api.post(`${base(businessUrn)}/programs`, { body: input, schema: loyaltyProgramSchema });
}

export interface UpdateProgramInput {
  status?: LoyaltyProgramStatus;
  rewardDescription?: string;
  stampsRequired?: number;
  /** Vacío borra las condiciones. */
  terms?: string;
  stampCooldownMinutes?: number;
}

export function updateProgram(
  businessUrn: string,
  programUrn: string,
  input: UpdateProgramInput,
): Promise<LoyaltyProgram> {
  return api.patch(program(businessUrn, programUrn), { body: input, schema: loyaltyProgramSchema });
}

/** El QR del alta, para imprimir. Requiere OWNER o ADMIN. */
export function generateProgramQr(businessUrn: string, programUrn: string): Promise<GeneratedQr> {
  return api.post(`${program(businessUrn, programUrn)}/qr`, { schema: generatedQrSchema });
}

export interface MembersQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export function listMembers(businessUrn: string, programUrn: string, query: MembersQuery): Promise<LoyaltyMembersPage> {
  return api.get(`${program(businessUrn, programUrn)}/members`, {
    query: { ...query },
    schema: loyaltyMembersPageSchema,
  });
}

/** Lo que lee la caja al escanear: a nivel negocio, dice de qué sucursal es la tarjeta. */
export function getMemberByCode(businessUrn: string, memberCode: string): Promise<LoyaltyMemberDetail> {
  return api.get(`${base(businessUrn)}/members/${enc(memberCode)}`, { schema: loyaltyMemberDetailSchema });
}

export function addStamp(businessUrn: string, programUrn: string, memberCode: string): Promise<LoyaltyActionResult> {
  return api.post(`${program(businessUrn, programUrn)}/members/${enc(memberCode)}/stamps`, {
    schema: loyaltyActionResultSchema,
  });
}

export function redeemReward(
  businessUrn: string,
  programUrn: string,
  memberCode: string,
): Promise<LoyaltyActionResult> {
  return api.post(`${program(businessUrn, programUrn)}/members/${enc(memberCode)}/redemptions`, {
    schema: loyaltyActionResultSchema,
  });
}

export function undoEvent(businessUrn: string, eventUrn: string): Promise<LoyaltyMember> {
  return api.post(`${base(businessUrn)}/events/${enc(eventUrn)}/undo`, { schema: loyaltyMemberSchema });
}

/** El link actual de la tarjeta, sin cambiarlo: para mandarlo por WhatsApp o mostrarlo como QR. */
export function getCardLink(businessUrn: string, memberCode: string): Promise<CardLink> {
  return api.get(`${base(businessUrn)}/members/${enc(memberCode)}/card-link`, { schema: cardLinkSchema });
}

/** Link nuevo para la tarjeta; el anterior deja de andar. */
export function regenerateCardLink(businessUrn: string, memberCode: string): Promise<CardLink> {
  return api.post(`${base(businessUrn)}/members/${enc(memberCode)}/card-link`, { schema: cardLinkSchema });
}

export function deleteMember(businessUrn: string, memberCode: string): Promise<void> {
  return api.delete(`${base(businessUrn)}/members/${enc(memberCode)}`);
}
