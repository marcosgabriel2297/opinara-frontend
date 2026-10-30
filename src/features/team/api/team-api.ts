import { type Business } from '@/features/businesses/api/schemas';
import { api, request } from '@/lib/http';

import {
  acceptedInvitationSchema,
  createdInvitationSchema,
  invitationLookupSchema,
  memberSchema,
  teamSchema,
  type CreatedInvitation,
  type InvitableRole,
  type InvitationLookup,
  type Member,
  type Team,
} from './schemas';

const base = (businessUrn: string) => `/businesses/${encodeURIComponent(businessUrn)}`;

export function getTeam(businessUrn: string): Promise<Team> {
  return api.get(`${base(businessUrn)}/members`, { schema: teamSchema });
}

export function inviteMember(businessUrn: string, email: string, role: InvitableRole): Promise<CreatedInvitation> {
  return api.post(`${base(businessUrn)}/invitations`, { body: { email, role }, schema: createdInvitationSchema });
}

export function revokeInvitation(businessUrn: string, invitationUrn: string): Promise<void> {
  return api.delete(`${base(businessUrn)}/invitations/${encodeURIComponent(invitationUrn)}`);
}

export function updateMemberRole(businessUrn: string, memberUrn: string, role: InvitableRole): Promise<Member> {
  return request(`${base(businessUrn)}/members/${encodeURIComponent(memberUrn)}`, {
    method: 'PATCH',
    body: { role },
    schema: memberSchema,
  });
}

export function removeMember(businessUrn: string, memberUrn: string): Promise<void> {
  return api.delete(`${base(businessUrn)}/members/${encodeURIComponent(memberUrn)}`);
}

/** El token va en el cuerpo, no en la URL: no queda en logs. No pide sesión. */
export function lookupInvitation(token: string): Promise<InvitationLookup> {
  return api.post('/invitations/lookup', { auth: false, body: { token }, schema: invitationLookupSchema });
}

export function acceptInvitation(token: string): Promise<Business> {
  return api.post('/invitations/accept', { body: { token }, schema: acceptedInvitationSchema });
}
