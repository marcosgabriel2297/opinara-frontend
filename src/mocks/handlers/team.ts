import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/http';

import { apiErrorBody, mockBusiness, mockUser } from '../fixtures';
import { mockState } from '../state';

const roleOf = (businessUrn: string) =>
  mockState.businesses.find((business) => business.urn === businessUrn)?.role ?? 'OWNER';

export const teamHandlers = [
  http.get(`${API_BASE_URL}/businesses/:businessUrn/members`, ({ params }) => {
    const viewer = roleOf(String(params.businessUrn));
    // Como el backend: las invitaciones pendientes solo las ven quienes invitan.
    return HttpResponse.json({
      members: mockState.team.members,
      invitations: viewer === 'MEMBER' ? [] : mockState.team.invitations,
    });
  }),

  http.post(`${API_BASE_URL}/businesses/:businessUrn/invitations`, async ({ request, params }) => {
    const body = (await request.json()) as { email?: string; role?: 'ADMIN' | 'MEMBER' };
    const email = (body.email ?? '').toLowerCase();
    const path = `/api/businesses/${String(params.businessUrn)}/invitations`;

    // Como el backend: solo se invita a quien ya tiene cuenta. En los mocks, los `sin-cuenta@…`.
    if (email.startsWith('sin-cuenta@')) {
      return HttpResponse.json(apiErrorBody(400, 'INVITEE_NOT_REGISTERED', path), { status: 400 });
    }
    if (mockState.team.members.some((member) => member.user.email === email)) {
      return HttpResponse.json(apiErrorBody(409, 'MEMBER_ALREADY_EXISTS', path), { status: 409 });
    }
    if (roleOf(String(params.businessUrn)) === 'ADMIN' && body.role === 'ADMIN') {
      return HttpResponse.json(apiErrorBody(403, 'MEMBER_ROLE_NOT_ALLOWED', path), { status: 403 });
    }

    const invitation = {
      urn: `urn:business-invitation:${email}`,
      email,
      role: body.role ?? 'MEMBER',
      expiresAt: '2026-11-03T12:00:00.000Z',
      createdAt: '2026-10-27T12:00:00.000Z',
    };
    mockState.team.invitations = [
      ...mockState.team.invitations.filter((current) => current.email !== email),
      invitation,
    ];
    return HttpResponse.json(
      { invitation, inviteUrl: `http://localhost:5173/invitations#token=invitacion-${email}` },
      { status: 201 },
    );
  }),

  http.delete(`${API_BASE_URL}/businesses/:businessUrn/invitations/:invitationUrn`, ({ params }) => {
    mockState.team.invitations = mockState.team.invitations.filter(
      (invitation) => invitation.urn !== String(params.invitationUrn),
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${API_BASE_URL}/businesses/:businessUrn/members/:memberUrn`, async ({ request, params }) => {
    const body = (await request.json()) as { role?: 'ADMIN' | 'MEMBER' };
    const target = mockState.team.members.find((member) => member.urn === String(params.memberUrn));
    if (target === undefined || target.role === 'OWNER' || body.role === undefined) {
      return HttpResponse.json(apiErrorBody(403, 'MEMBER_ROLE_NOT_ALLOWED', '/api/members'), { status: 403 });
    }
    const updated = { ...target, role: body.role };
    mockState.team.members = mockState.team.members.map((member) => (member.urn === updated.urn ? updated : member));
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE_URL}/businesses/:businessUrn/members/:memberUrn`, ({ params }) => {
    const target = mockState.team.members.find((member) => member.urn === String(params.memberUrn));
    if (target?.user.urn === mockUser.urn) {
      // Se fue del negocio: deja de estar en su lista.
      mockState.businesses = mockState.businesses.filter((business) => business.urn !== String(params.businessUrn));
    }
    mockState.team.members = mockState.team.members.filter((member) => member.urn !== String(params.memberUrn));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/invitations/lookup`, async ({ request }) => {
    const { token = '' } = (await request.json()) as { token?: string };
    const invitation = mockState.invitations.get(token);
    if (invitation === undefined) {
      return HttpResponse.json(apiErrorBody(404, 'INVITATION_NOT_FOUND', '/api/invitations/lookup'), { status: 404 });
    }
    return HttpResponse.json(invitation);
  }),

  http.post(`${API_BASE_URL}/invitations/accept`, async ({ request }) => {
    const { token = '' } = (await request.json()) as { token?: string };
    const invitation = mockState.invitations.get(token);
    if (invitation?.status !== 'PENDING') {
      return HttpResponse.json(apiErrorBody(400, 'INVITATION_INVALID', '/api/invitations/accept'), { status: 400 });
    }
    mockState.invitations.set(token, { ...invitation, status: 'ACCEPTED' });
    const joined = { ...mockBusiness, role: invitation.role };
    mockState.businesses = [...mockState.businesses.filter((business) => business.urn !== joined.urn), joined];
    return HttpResponse.json(joined);
  }),
];
