import { http, HttpResponse } from 'msw';

import { type LoyaltyEvent, type LoyaltyMember } from '@/features/loyalty/api/schemas';
import { API_BASE_URL } from '@/lib/http';

import {
  apiErrorBody,
  mockBusiness,
  mockDefaultInactiveReminderMessage,
  mockDefaultReminderMessage,
  mockImportedLocation,
  type mockLoyaltyMembers,
  mockQrPngDataUrl,
} from '../fixtures';
import { mockState } from '../state';

type StoredMember = (typeof mockLoyaltyMembers)[number];

const base = `${API_BASE_URL}/businesses/:businessUrn/loyalty`;
const UNDO_WINDOW_MS = 15 * 60 * 1000;
const TOKEN_HEADER = 'X-Loyalty-Card-Token';

const error = (status: number, code: string) => HttpResponse.json(apiErrorBody(status, code), { status });
const decode = (value: unknown) => decodeURIComponent(String(value));

/** Mismo contrato que el guard del backend: sin la funcionalidad en el plan, 403. */
const withoutFeature = (businessUrn: unknown) => {
  const business = mockState.businesses.find((candidate) => candidate.urn === decode(businessUrn));
  return !business?.features.includes('LOYALTY');
};

/** Sacar sellos (y deshacerlo) queda solo para ADMIN, como en el backend. */
const canCorrect = (businessUrn: unknown) => {
  const business = mockState.businesses.find((candidate) => candidate.urn === decode(businessUrn));
  return business?.role === 'ADMIN';
};

/** Ver y mandar recordatorios: OWNER y ADMIN. */
const canManage = (businessUrn: unknown) => {
  const business = mockState.businesses.find((candidate) => candidate.urn === decode(businessUrn));
  return business?.role === 'OWNER' || business?.role === 'ADMIN';
};

const programOf = (urn: string) => mockState.loyalty.programs.find((program) => program.urn === urn);
const memberByCode = (code: string) =>
  mockState.loyalty.members.find((member) => member.memberCode === code.toUpperCase());

/** Lo que devuelve la caja: sin el token. */
function toStaff(member: StoredMember): LoyaltyMember {
  const program = programOf(member.programUrn);
  const stampsRequired = program?.stampsRequired ?? member.stampsRequired;
  const { cardToken: _token, ...rest } = member;
  const cooldownMs = (program?.stampCooldownMinutes ?? 0) * 60 * 1000;
  return {
    ...rest,
    stampsRequired,
    rewardAvailable: member.stamps >= stampsRequired,
    nextStampAt:
      member.lastStampAt === null ? null : new Date(Date.parse(member.lastStampAt) + cooldownMs).toISOString(),
  };
}

function update(code: string, changes: Partial<StoredMember>): StoredMember {
  let updated: StoredMember | undefined;
  mockState.loyalty.members = mockState.loyalty.members.map((member) => {
    if (member.memberCode !== code) return member;
    updated = { ...member, ...changes };
    return updated;
  });
  if (updated === undefined) throw new Error(`No hay tarjeta ${code}`);
  return updated;
}

function bump(programUrn: string, counter: 'members' | 'stamps' | 'redemptions', amount: number) {
  mockState.loyalty.programs = mockState.loyalty.programs.map((program) =>
    program.urn === programUrn
      ? { ...program, stats: { ...program.stats, [counter]: program.stats[counter] + amount } }
      : program,
  );
}

function record(member: StoredMember, type: LoyaltyEvent['type'], amount: number) {
  const createdAt = new Date();
  const event = {
    urn: `urn:loyalty-event:${String(mockState.loyalty.events.length + 1)}`,
    type,
    amount,
    createdAt: createdAt.toISOString(),
    undoableUntil: new Date(createdAt.getTime() + UNDO_WINDOW_MS).toISOString(),
    memberUrn: member.urn,
    programUrn: member.programUrn,
    undone: false,
  };
  mockState.loyalty.events = [...mockState.loyalty.events, event];
  const { memberUrn: _member, programUrn: _program, undone: _undone, ...publicEvent } = event;
  return publicEvent;
}

/** Para encontrar la sucursal y el negocio de una tarjeta desde lo público. */
function publicView(member: StoredMember) {
  const program = programOf(member.programUrn);
  if (program === undefined) return null;
  const business = mockState.businesses[0] ?? mockBusiness;
  return {
    business: { name: business.name, slug: business.slug, logoUpdatedAt: business.logoUpdatedAt },
    location: { title: program.location.title },
    program: {
      rewardDescription: program.rewardDescription,
      stampsRequired: program.stampsRequired,
      terms: program.terms,
      active: program.status === 'ACTIVE' && business.features.includes('LOYALTY'),
    },
    member: {
      name: member.name,
      phone: member.phone,
      email: member.email,
      memberCode: member.memberCode,
      qrPngDataUrl: mockQrPngDataUrl,
      stamps: member.stamps,
      rewardAvailable: member.stamps >= program.stampsRequired,
      totalRedemptions: member.totalRedemptions,
      remindersEnabled: member.remindersOptOutBy === null,
      createdAt: member.createdAt,
    },
  };
}

/** Lo justo para el mock: lo que hace el backend con los formatos comunes. */
function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('54')) digits = digits.slice(2);
  if (digits.startsWith('9')) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 12 && digits.slice(2, 4) === '15') digits = digits.slice(0, 2) + digits.slice(4);
  return digits.length === 10 ? `+549${digits}` : null;
}

export const loyaltyHandlers = [
  http.get(`${base}/programs`, ({ params }) => {
    if (withoutFeature(params.businessUrn)) return error(403, 'PLAN_FEATURE_NOT_INCLUDED');
    return HttpResponse.json(mockState.loyalty.programs);
  }),

  http.post(`${base}/programs`, async ({ params, request }) => {
    if (withoutFeature(params.businessUrn)) return error(403, 'PLAN_FEATURE_NOT_INCLUDED');
    const body = (await request.json()) as {
      locationUrn: string;
      rewardDescription: string;
      stampsRequired?: number;
      terms?: string;
    };
    if (mockState.loyalty.programs.some((program) => program.location.urn === body.locationUrn)) {
      return error(409, 'LOYALTY_PROGRAM_ALREADY_EXISTS');
    }
    const title =
      body.locationUrn === mockImportedLocation.urn
        ? mockImportedLocation.title
        : (mockState.manualLocations.find((location) => location.urn === body.locationUrn)?.title ?? 'Sucursal');
    const slug = title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const created = {
      urn: `urn:loyalty-program:${slug}`,
      location: { urn: body.locationUrn, title, isActive: true },
      slug,
      status: 'ACTIVE' as const,
      stampsRequired: body.stampsRequired ?? 5,
      rewardDescription: body.rewardDescription,
      terms: body.terms ?? null,
      stampCooldownMinutes: 10,
      reminderMessage: mockDefaultReminderMessage,
      reminderMessageIsDefault: true,
      inactiveDays: 20,
      inactiveReminderMessage: mockDefaultInactiveReminderMessage,
      inactiveReminderMessageIsDefault: true,
      stats: { members: 0, stamps: 0, redemptions: 0 },
      signupUrl: `http://localhost:5173/f/${mockBusiness.slug}/${slug}`,
      createdAt: new Date().toISOString(),
    };
    mockState.loyalty.programs = [...mockState.loyalty.programs, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${base}/programs/:programUrn`, ({ params }) => {
    if (withoutFeature(params.businessUrn)) return error(403, 'PLAN_FEATURE_NOT_INCLUDED');
    const program = programOf(decode(params.programUrn));
    return program === undefined ? error(404, 'LOYALTY_PROGRAM_NOT_FOUND') : HttpResponse.json(program);
  }),

  http.patch(`${base}/programs/:programUrn`, async ({ params, request }) => {
    const program = programOf(decode(params.programUrn));
    if (program === undefined) return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    const body = (await request.json()) as Record<string, unknown>;
    const updated = {
      ...program,
      ...body,
      terms: body.terms === undefined ? program.terms : body.terms === '' ? null : (body.terms as string),
      ...(body.reminderMessage === undefined
        ? {}
        : body.reminderMessage === '' || body.reminderMessage === mockDefaultReminderMessage
          ? { reminderMessage: mockDefaultReminderMessage, reminderMessageIsDefault: true }
          : { reminderMessage: body.reminderMessage as string, reminderMessageIsDefault: false }),
      ...(body.inactiveReminderMessage === undefined
        ? {}
        : body.inactiveReminderMessage === '' || body.inactiveReminderMessage === mockDefaultInactiveReminderMessage
          ? { inactiveReminderMessage: mockDefaultInactiveReminderMessage, inactiveReminderMessageIsDefault: true }
          : {
              inactiveReminderMessage: body.inactiveReminderMessage as string,
              inactiveReminderMessageIsDefault: false,
            }),
    };
    mockState.loyalty.programs = mockState.loyalty.programs.map((candidate) =>
      candidate.urn === program.urn ? updated : candidate,
    );
    return HttpResponse.json(updated);
  }),

  http.post(`${base}/programs/:programUrn/qr`, ({ params }) => {
    const program = programOf(decode(params.programUrn));
    if (program === undefined) return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    return HttpResponse.json({ targetUrl: program.signupUrl, pngDataUrl: mockQrPngDataUrl }, { status: 201 });
  }),

  http.get(`${base}/programs/:programUrn/members`, ({ params, request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const digits = search.replace(/\D/g, '');
    const code = search.toUpperCase().replace(/[\s-]/g, '');

    const matches = mockState.loyalty.members
      .filter((member) => member.programUrn === decode(params.programUrn))
      .filter(
        (member) =>
          search === '' ||
          (digits.length >= 3
            ? member.phone.endsWith(digits)
            : member.name.toLowerCase().includes(search.toLowerCase())) ||
          member.memberCode === code,
      );

    return HttpResponse.json({
      items: matches.slice(page * limit, (page + 1) * limit).map(toStaff),
      page,
      limit,
      total: matches.length,
    });
  }),

  http.get(`${base}/members/:memberCode`, ({ params }) => {
    if (withoutFeature(params.businessUrn)) return error(403, 'PLAN_FEATURE_NOT_INCLUDED');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    const program = programOf(member.programUrn);
    return HttpResponse.json({
      ...toStaff(member),
      program: {
        urn: member.programUrn,
        locationUrn: program?.location.urn ?? '',
        locationTitle: program?.location.title ?? '',
      },
    });
  }),

  http.post(`${base}/programs/:programUrn/members/:memberCode/stamps`, ({ params }) => {
    const program = programOf(decode(params.programUrn));
    if (program === undefined) return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    if (program.status !== 'ACTIVE') return error(409, 'LOYALTY_PROGRAM_PAUSED');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    if (member.programUrn !== program.urn) return error(409, 'LOYALTY_WRONG_LOCATION');
    const cooldown = program.stampCooldownMinutes * 60 * 1000;
    if (member.lastStampAt !== null && Date.now() - Date.parse(member.lastStampAt) < cooldown) {
      return error(409, 'LOYALTY_STAMP_COOLDOWN');
    }

    const updated = update(member.memberCode, {
      stamps: member.stamps + 1,
      totalStamps: member.totalStamps + 1,
      lastStampAt: new Date().toISOString(),
    });
    bump(program.urn, 'stamps', 1);
    return HttpResponse.json(
      {
        member: toStaff(updated),
        event: record(updated, 'STAMP', 1),
        rewardReached: member.stamps < program.stampsRequired && updated.stamps >= program.stampsRequired,
      },
      { status: 201 },
    );
  }),

  http.post(`${base}/programs/:programUrn/members/:memberCode/redemptions`, ({ params }) => {
    const program = programOf(decode(params.programUrn));
    if (program === undefined) return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    if (program.status !== 'ACTIVE') return error(409, 'LOYALTY_PROGRAM_PAUSED');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    if (member.programUrn !== program.urn) return error(409, 'LOYALTY_WRONG_LOCATION');
    if (member.stamps < program.stampsRequired) return error(409, 'LOYALTY_NOT_ENOUGH_STAMPS');

    const updated = update(member.memberCode, {
      stamps: member.stamps - program.stampsRequired,
      totalRedemptions: member.totalRedemptions + 1,
    });
    bump(program.urn, 'redemptions', 1);
    return HttpResponse.json(
      { member: toStaff(updated), event: record(updated, 'REDEMPTION', program.stampsRequired), rewardReached: false },
      { status: 201 },
    );
  }),

  http.post(`${base}/programs/:programUrn/members/:memberCode/stamp-removals`, async ({ params, request }) => {
    if (!canCorrect(params.businessUrn)) return error(403, 'BUSINESS_FORBIDDEN');
    const program = programOf(decode(params.programUrn));
    if (program === undefined) return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    if (member.programUrn !== program.urn) return error(409, 'LOYALTY_WRONG_LOCATION');
    const { stamps } = (await request.json()) as { stamps: number };
    if (!Number.isInteger(stamps) || stamps < 1) return error(400, 'BAD_REQUEST');
    if (member.stamps < stamps) return error(409, 'LOYALTY_REMOVE_EXCEEDS_STAMPS');

    const updated = update(member.memberCode, {
      stamps: member.stamps - stamps,
      totalStamps: member.totalStamps - stamps,
    });
    bump(program.urn, 'stamps', -stamps);
    return HttpResponse.json(
      { member: toStaff(updated), event: record(updated, 'STAMP_REMOVAL', stamps), rewardReached: false },
      { status: 201 },
    );
  }),

  http.post(`${base}/events/:eventUrn/undo`, ({ params }) => {
    const event = mockState.loyalty.events.find((candidate) => candidate.urn === decode(params.eventUrn));
    if (event === undefined) return error(404, 'NOT_FOUND');
    const latest = mockState.loyalty.events
      .filter((candidate) => candidate.memberUrn === event.memberUrn && !candidate.undone)
      .at(-1);
    if (event.undone || latest?.urn !== event.urn || Date.parse(event.undoableUntil) < Date.now()) {
      return error(409, 'LOYALTY_UNDO_NOT_ALLOWED');
    }
    if (event.type === 'STAMP_REMOVAL' && !canCorrect(params.businessUrn)) return error(403, 'FORBIDDEN');
    const member = mockState.loyalty.members.find((candidate) => candidate.urn === event.memberUrn);
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');

    mockState.loyalty.events = mockState.loyalty.events.map((candidate) =>
      candidate.urn === event.urn ? { ...candidate, undone: true } : candidate,
    );
    let reverted: StoredMember;
    if (event.type === 'STAMP') {
      reverted = update(member.memberCode, {
        stamps: member.stamps - 1,
        totalStamps: member.totalStamps - 1,
        lastStampAt: null,
      });
      bump(event.programUrn, 'stamps', -1);
    } else if (event.type === 'REDEMPTION') {
      reverted = update(member.memberCode, {
        stamps: member.stamps + event.amount,
        totalRedemptions: member.totalRedemptions - 1,
      });
      bump(event.programUrn, 'redemptions', -1);
    } else {
      reverted = update(member.memberCode, {
        stamps: member.stamps + event.amount,
        totalStamps: member.totalStamps + event.amount,
      });
      bump(event.programUrn, 'stamps', event.amount);
    }
    return HttpResponse.json(toStaff(reverted));
  }),

  /** Misma regla que el backend: cerca del premio (desde el día siguiente) o sin venir hace `inactiveDays`; uno por vuelta. */
  http.get(`${base}/reminders`, ({ params, request }) => {
    if (withoutFeature(params.businessUrn)) return error(403, 'PLAN_FEATURE_NOT_INCLUDED');
    if (!canManage(params.businessUrn)) return error(403, 'BUSINESS_FORBIDDEN');
    const url = new URL(request.url);
    const programUrn = url.searchParams.get('programUrn');
    const reasonFilter = url.searchParams.get('reason');
    const page = Number(url.searchParams.get('page') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const today = new Date().toDateString();
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const matches = mockState.loyalty.members.flatMap((member) => {
      const program = programOf(member.programUrn);
      if (program?.status !== 'ACTIVE' || !program.location.isActive) return [];
      if (programUrn !== null && program.urn !== programUrn) return [];
      if (member.remindersOptOutBy !== null) return [];
      const lastVisit = member.lastStampAt ?? member.createdAt ?? new Date(now).toISOString();
      if (member.lastReminderAt !== null && Date.parse(member.lastReminderAt) >= Date.parse(lastVisit)) return [];
      const missing = program.stampsRequired - member.stamps;
      const near =
        member.stamps >= 1 &&
        missing >= 1 &&
        missing <= 2 &&
        member.lastStampAt !== null &&
        new Date(member.lastStampAt).toDateString() !== today;
      // Igual que el backend: "no viene" es para los que no están cerca del premio (o tienen 0 sellos).
      const inactive =
        member.stamps < Math.max(1, program.stampsRequired - 2) &&
        now - Date.parse(lastVisit) >= program.inactiveDays * DAY_MS;
      const reason = near ? 'NEAR_REWARD' : inactive ? 'INACTIVE' : null;
      if (reason === null || (reasonFilter !== null && reasonFilter !== reason)) return [];
      return [{ member, program, reason, missing, lastVisit }];
    });

    return HttpResponse.json({
      items: matches.slice(page * limit, (page + 1) * limit).map(({ member, program, reason, missing, lastVisit }) => {
        const values: Record<string, string> = {
          nombre: member.name.split(' ')[0] ?? member.name,
          faltan: missing === 1 ? '1 sello' : `${String(missing)} sellos`,
          sellos: `${String(member.stamps)} de ${String(program.stampsRequired)} sellos`,
          premio: program.rewardDescription,
          negocio: mockBusiness.name,
          sucursal: program.location.title,
        };
        const template = reason === 'NEAR_REWARD' ? program.reminderMessage : program.inactiveReminderMessage;
        const text = template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
        return {
          member: toStaff(member),
          program: { urn: member.programUrn, locationTitle: program.location.title },
          reason,
          missingStamps: missing,
          daysSinceVisit: Math.floor((now - Date.parse(lastVisit)) / DAY_MS),
          message: `${text.trim()}\nhttp://localhost:5173/card#token=${member.cardToken}`,
        };
      }),
      page,
      limit,
      total: matches.length,
    });
  }),

  http.post(`${base}/reminders/:memberCode/sent`, ({ params }) => {
    if (!canManage(params.businessUrn)) return error(403, 'BUSINESS_FORBIDDEN');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    if (member.remindersOptOutBy !== null) return error(409, 'LOYALTY_REMINDERS_OPTED_OUT');
    update(member.memberCode, { lastReminderAt: new Date().toISOString() });
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${base}/members/:memberCode/reminders`, async ({ params, request }) => {
    if (!canManage(params.businessUrn)) return error(403, 'BUSINESS_FORBIDDEN');
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    const { enabled } = (await request.json()) as { enabled: boolean };
    if (enabled && member.remindersOptOutBy === 'CLIENT') return error(409, 'LOYALTY_REMINDERS_OPTED_OUT');
    const updated = update(member.memberCode, {
      remindersOptOutBy: enabled ? null : (member.remindersOptOutBy ?? 'BUSINESS'),
    });
    return HttpResponse.json(toStaff(updated));
  }),

  http.get(`${base}/members/:memberCode/card-link`, ({ params }) => {
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    return HttpResponse.json({
      cardUrl: `http://localhost:5173/card#token=${member.cardToken}`,
      pngDataUrl: mockQrPngDataUrl,
    });
  }),

  http.post(`${base}/members/:memberCode/card-link`, ({ params }) => {
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    const token = `token-nuevo-${member.memberCode.toLowerCase()}-0123456789abcdefghij`;
    update(member.memberCode, { cardToken: token });
    return HttpResponse.json({ cardUrl: `http://localhost:5173/card#token=${token}`, pngDataUrl: mockQrPngDataUrl });
  }),

  http.delete(`${base}/members/:memberCode`, ({ params }) => {
    const member = memberByCode(decode(params.memberCode));
    if (member === undefined) return error(404, 'LOYALTY_MEMBER_NOT_FOUND');
    mockState.loyalty.members = mockState.loyalty.members.filter((candidate) => candidate.urn !== member.urn);
    bump(member.programUrn, 'members', -1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Lo público. `/card` antes que `/:businessSlug/:programSlug`: igual no chocan (uno vs. dos segmentos).
  http.get(`${API_BASE_URL}/public/loyalty/card`, ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    const member = mockState.loyalty.members.find((candidate) => candidate.cardToken === token);
    const view = member === undefined ? null : publicView(member);
    return view === null ? error(404, 'LOYALTY_CARD_NOT_FOUND') : HttpResponse.json(view);
  }),

  http.delete(`${API_BASE_URL}/public/loyalty/card`, ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    const member = mockState.loyalty.members.find((candidate) => candidate.cardToken === token);
    if (member === undefined) return error(404, 'LOYALTY_CARD_NOT_FOUND');
    mockState.loyalty.members = mockState.loyalty.members.filter((candidate) => candidate.urn !== member.urn);
    bump(member.programUrn, 'members', -1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${API_BASE_URL}/public/loyalty/card/reminders`, async ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    const member = mockState.loyalty.members.find((candidate) => candidate.cardToken === token);
    if (member === undefined) return error(404, 'LOYALTY_CARD_NOT_FOUND');
    const { enabled } = (await request.json()) as { enabled: boolean };
    const updated = update(member.memberCode, { remindersOptOutBy: enabled ? null : 'CLIENT' });
    return HttpResponse.json({ remindersEnabled: updated.remindersOptOutBy === null });
  }),

  http.post(`${API_BASE_URL}/public/loyalty/card/resend`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API_BASE_URL}/public/loyalty/:businessSlug/:programSlug`, ({ params }) => {
    const business = mockState.businesses.find((candidate) => candidate.slug === params.businessSlug);
    const program = mockState.loyalty.programs.find((candidate) => candidate.slug === params.programSlug);
    if (business === undefined || program?.status !== 'ACTIVE' || !business.features.includes('LOYALTY')) {
      return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    }
    return HttpResponse.json({
      business: { name: business.name, slug: business.slug, logoUpdatedAt: business.logoUpdatedAt },
      location: { title: program.location.title },
      program: {
        rewardDescription: program.rewardDescription,
        stampsRequired: program.stampsRequired,
        terms: program.terms,
      },
      termsVersion: '2026-11-06',
    });
  }),

  http.post(`${API_BASE_URL}/public/loyalty/:businessSlug/:programSlug/members`, async ({ params, request }) => {
    const program = mockState.loyalty.programs.find((candidate) => candidate.slug === params.programSlug);
    if (program?.status !== 'ACTIVE') return error(404, 'LOYALTY_PROGRAM_NOT_FOUND');
    const body = (await request.json()) as {
      name: string;
      phone: string;
      email?: string;
      acceptTerms: boolean;
      marketing: boolean;
      website?: string;
    };
    if (!body.acceptTerms) return error(400, 'BAD_REQUEST');
    const phone = normalizePhone(body.phone);
    if (phone === null) return error(400, 'LOYALTY_INVALID_PHONE');
    if (mockState.loyalty.members.some((member) => member.programUrn === program.urn && member.phone === phone)) {
      return error(409, 'LOYALTY_ALREADY_REGISTERED');
    }

    const index = mockState.loyalty.members.length + 1;
    const cardToken = `token-de-la-tarjeta-nueva-${String(index)}-0123456789abcdef`;
    mockState.loyalty.members = [
      ...mockState.loyalty.members,
      {
        urn: `urn:loyalty-member:${String(index)}`,
        memberCode: `NUEV${String(index).padStart(2, '2')}`.slice(0, 6),
        programUrn: program.urn,
        name: body.name,
        phone,
        email: body.email ?? null,
        stamps: 0,
        stampsRequired: program.stampsRequired,
        rewardAvailable: false,
        totalStamps: 0,
        totalRedemptions: 0,
        lastStampAt: null,
        nextStampAt: null,
        lastReminderAt: null,
        remindersOptOutBy: null,
        marketing: body.marketing,
        createdAt: new Date().toISOString(),
        cardToken,
      },
    ];
    bump(program.urn, 'members', 1);
    return HttpResponse.json({ cardToken }, { status: 201 });
  }),
];
