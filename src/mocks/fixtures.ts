import { type Team } from '@/features/team/api/schemas';
import { type Business } from '@/features/businesses/api/schemas';
import { type Campaign } from '@/features/campaigns/api/schemas';
import { type LoyaltyMember, type LoyaltyProgram } from '@/features/loyalty/api/schemas';
import { type Review } from '@/features/reviews/api/schemas';

/** Datos con la misma forma que devuelve el backend sembrado (`yarn seed`). */

export const mockUser = {
  urn: 'urn:user:11111111-1111-4111-8111-111111111111',
  email: 'dueno@opinara.test',
  name: 'Dueño de prueba',
  status: 'ACTIVE',
  mustChangePassword: false,
  createdAt: '2026-01-05T12:00:00.000Z',
} as const;

export const mockBusiness: Business = {
  urn: 'urn:business:22222222-2222-4222-8222-222222222222',
  name: 'Café de la Esquina',
  slug: 'cafe-de-la-esquina',
  status: 'ACTIVE',
  timezone: 'America/Argentina/Buenos_Aires',
  createdAt: '2026-01-05T12:00:00.000Z',
  logoUpdatedAt: null,
  role: 'OWNER',
  features: ['LOYALTY'],
};

export const mockTokens = {
  accessToken: 'access-token-de-prueba',
  refreshToken: 'refresh-token-de-prueba',
  expiresIn: 86400,
} as const;

export const mockSession = { user: mockUser, ...mockTokens } as const;

export const mockGoogleConnection = {
  urn: 'urn:google-connection:33333333-3333-4333-8333-333333333333',
  status: 'ACTIVE',
  scopes: ['https://www.googleapis.com/auth/business.manage'],
  connectedAt: '2026-06-16T02:26:10.637Z',
  connectedByUserUrn: mockUser.urn,
} as const;

export const mockGoogleAccount = {
  name: 'accounts/1234567890',
  displayName: 'Café de la Esquina',
  type: 'LOCATION_GROUP',
  verificationState: 'VERIFIED',
} as const;

/** Sucursal de Google ya importada a Opinara. */
export const mockImportedLocation = {
  googleName: 'locations/111',
  urn: 'urn:location:44444444-4444-4444-8444-444444444444',
  title: 'Café de la Esquina — Centro',
} as const;

/** Lo que devuelve Google para esa cuenta: una importada, una nueva, y una sin link de reseñas. */
export const mockGoogleLocations = [
  {
    name: mockImportedLocation.googleName,
    locationId: '111',
    title: mockImportedLocation.title,
    storeCode: 'CENTRO',
    address: 'Av. Corrientes 1234, CABA',
    placeId: 'ChIJ18273645ficticio',
    newReviewUri: 'https://search.google.com/local/writereview?placeid=ChIJ18273645ficticio',
    hasVoiceOfMerchant: true,
  },
  {
    name: 'locations/222',
    locationId: '222',
    title: 'Café de la Esquina — Palermo',
    storeCode: 'PALERMO',
    address: 'Av. Santa Fe 4321, CABA',
    placeId: 'ChIJ99999999ficticio',
    newReviewUri: 'https://search.google.com/local/writereview?placeid=ChIJ99999999ficticio',
    hasVoiceOfMerchant: true,
  },
  {
    name: 'locations/333',
    locationId: '333',
    title: 'Café de la Esquina — Depósito',
    address: 'Warnes 500, CABA',
    // Sin `newReviewUri`: no se puede usar en una campaña de QR.
    hasVoiceOfMerchant: false,
  },
] as const;

/**
 * Reseñas con los casos raros que el contrato permite y la UI tiene que aguantar:
 * anónima, sin comentario, rating 0, y una ya respondida.
 */
export const mockReviews: Review[] = [
  {
    urn: 'urn:review:aaaa1111',
    locationUrn: mockImportedLocation.urn,
    rating: 5,
    comment: 'Excelente atención y el café es el mejor del barrio.',
    reviewer: {
      displayName: 'Ana Pérez',
      profilePhotoUrl: 'https://lh3.googleusercontent.com/ficticio',
      isAnonymous: false,
    },
    createdAt: '2026-09-12T02:26:10.652Z',
    updatedAt: '2026-09-12T02:26:10.652Z',
    syncedAt: '2026-09-14T02:26:10.652Z',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ficticio',
  },
  {
    urn: 'urn:review:bbbb2222',
    locationUrn: mockImportedLocation.urn,
    rating: 2,
    comment: 'Esperamos 40 minutos por dos cafés.',
    reviewer: { displayName: 'Rodrigo Blanco', isAnonymous: false },
    createdAt: '2026-09-05T02:26:10.653Z',
    updatedAt: '2026-09-05T02:26:10.653Z',
    reply: {
      comment: 'Rodrigo, lamentamos la demora. Sumamos una persona en barra.',
      updatedAt: '2026-09-06T02:26:10.653Z',
    },
    syncedAt: '2026-09-14T02:26:10.654Z',
  },
  {
    // Anónima: sin nombre y sin foto, y además sin comentario.
    urn: 'urn:review:cccc3333',
    locationUrn: mockImportedLocation.urn,
    rating: 4,
    reviewer: { isAnonymous: true },
    createdAt: '2026-09-01T02:26:10.653Z',
    updatedAt: '2026-09-01T02:26:10.653Z',
    syncedAt: '2026-09-14T02:26:10.654Z',
  },
  {
    // Google no informó calificación.
    urn: 'urn:review:dddd4444',
    locationUrn: mockImportedLocation.urn,
    rating: 0,
    comment: 'Sin estrellas, solo texto.',
    reviewer: { displayName: 'Valeria Gómez', isAnonymous: false },
    createdAt: '2026-08-23T02:26:10.656Z',
    updatedAt: '2026-08-23T02:26:10.656Z',
    syncedAt: '2026-09-14T02:26:10.656Z',
  },
];

/** Un PNG de 1x1 transparente: alcanza para probar la descarga sin inventar un QR real. */
export const mockQrPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const mockCampaigns: Campaign[] = [
  {
    urn: 'urn:campaign:mostrador',
    name: 'Mostrador',
    slug: 'mostrador',
    locationUrn: mockImportedLocation.urn,
    status: 'ACTIVE',
    stats: { scans: 200, googleClicks: 41 },
    targetUrl: 'http://localhost:5173/r/cafe-de-la-esquina/mostrador',
    createdAt: '2026-09-01T02:26:10.687Z',
  },
];

/** Lo que ve quien escanea el QR de la campaña "Mostrador": nombres para mostrar y el link. */

/** Escaneos por semana de ejemplo (12 semanas, de la más vieja a la actual). */
export const mockScanWeeks = [0, 0, 3, 8, 11, 14, 17, 21, 18, 26, 37, 45];

/** Lo que el mock "sugiere" según las estrellas: suficiente para ver el flujo sin un modelo. */
export function mockSuggestion(rating: number, firstName: string | undefined): string {
  const name = firstName === undefined ? '' : `, ${firstName}`;
  if (rating > 0 && rating <= 2) {
    return `Gracias por contarnos${name}, y perdón: no es la experiencia que queremos darte. Nos encantaría que nos des otra oportunidad.`;
  }
  if (rating === 3) return `Gracias por tu reseña${name}. Tomamos nota para mejorar, ¡te esperamos de nuevo!`;
  return `¡Gracias${name}! Nos alegra un montón que la hayas pasado bien. Te esperamos pronto.`;
}

/** Error con la forma exacta del filtro global del backend. */
export function apiErrorBody(statusCode: number, errorCode: string, path = '/api/test') {
  return {
    statusCode,
    message: errorCode,
    errorCode,
    timestamp: new Date().toISOString(),
    path,
  };
}

/** El equipo del negocio de prueba: el dueño y una administradora. */
export const mockTeam: Team = {
  members: [
    {
      urn: 'urn:business-member:dueno',
      role: 'OWNER',
      joinedAt: '2026-01-05T12:00:00.000Z',
      user: { urn: mockUser.urn, name: mockUser.name, email: mockUser.email },
    },
    {
      urn: 'urn:business-member:gerente',
      role: 'ADMIN',
      joinedAt: '2026-02-10T12:00:00.000Z',
      user: { urn: 'urn:user:gerente', name: 'Martina Gómez', email: 'gerente@opinara.test' },
    },
  ],
  invitations: [],
};

/** Los links de los mails de prueba (recuperar contraseña, invitación). */
export const mockResetToken = 'token-de-recuperacion-de-prueba-0123456789';
export const mockInvitationToken = 'token-de-invitacion-de-prueba-0123456789';

/** La tarjeta de sellos de la sucursal Centro. */
export const mockLoyaltyProgram: LoyaltyProgram = {
  urn: 'urn:loyalty-program:centro',
  location: { urn: mockImportedLocation.urn, title: mockImportedLocation.title, isActive: true },
  slug: 'centro',
  status: 'ACTIVE',
  stampsRequired: 5,
  rewardDescription: 'Un café gratis',
  terms: 'No acumulable con otras promociones.',
  stampCooldownMinutes: 10,
  stats: { members: 2, stamps: 8, redemptions: 1 },
  signupUrl: 'http://localhost:5173/f/cafe-de-la-esquina/centro',
  createdAt: '2026-11-01T12:00:00.000Z',
};

/** Clientes de la tarjeta: Ana a mitad de camino y Bruno con el premio listo. Con su token, para `/card`. */
export const mockLoyaltyMembers: (LoyaltyMember & { cardToken: string })[] = [
  {
    urn: 'urn:loyalty-member:ana',
    memberCode: 'K3F9QX',
    programUrn: mockLoyaltyProgram.urn,
    name: 'Ana',
    phone: '+5491123456789',
    email: 'ana@mail.test',
    stamps: 3,
    stampsRequired: 5,
    rewardAvailable: false,
    totalStamps: 3,
    totalRedemptions: 0,
    lastStampAt: null,
    marketing: true,
    createdAt: '2026-11-02T12:00:00.000Z',
    cardToken: 'token-de-la-tarjeta-de-ana-0123456789abcdef',
  },
  {
    urn: 'urn:loyalty-member:bruno',
    memberCode: 'B7N2WZ',
    programUrn: mockLoyaltyProgram.urn,
    name: 'Bruno',
    phone: '+5491155550000',
    email: null,
    stamps: 5,
    stampsRequired: 5,
    rewardAvailable: true,
    totalStamps: 10,
    totalRedemptions: 1,
    lastStampAt: null,
    marketing: false,
    createdAt: '2026-11-03T12:00:00.000Z',
    cardToken: 'token-de-la-tarjeta-de-bruno-0123456789abcd',
  },
];
