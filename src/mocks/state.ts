import {
  mockBusiness,
  mockCampaigns,
  mockGoogleConnection,
  mockImportedLocation,
  mockReviews,
  mockInvitationToken,
  mockResetToken,
  mockScanWeeks,
  mockTeam,
} from './fixtures';
import { type Location } from '@/features/locations/api/schemas';
import { type InvitationLookup, type Team } from '@/features/team/api/schemas';

type ConnectionStatus = 'ACTIVE' | 'REVOKED' | 'DISCONNECTED';

interface MockState {
  businesses: (typeof mockBusiness)[];
  connection: { status: ConnectionStatus; connectedAt: string; lastSyncAt?: string } | null;
  /** Nombres de recurso de Google (`locations/{id}`) ya importados. */
  importedLocationNames: Set<string>;
  /** Sucursales dadas de alta a mano (`POST /locations`), tal como las devuelve la API. */
  manualLocations: Location[];
  reviews: typeof mockReviews;
  campaigns: typeof mockCampaigns;
  /** Sucursales que NO tienen link de reseñas en Google. */
  locationsWithoutReviewUrl: Set<string>;
  /** Sucursales importadas pero desactivadas (`isActive: false`). */
  inactiveLocations: Set<string>;
  /** Respuestas sugeridas: disponibles, sin credenciales en el servidor, o fallando. */
  replySuggestions: 'ok' | 'unavailable' | 'failed';
  /** Escaneos de las últimas semanas (de la más vieja a la actual), para los gráficos. */
  scanWeeks: number[];
  /** Logos subidos, por slug del negocio. */
  logos: Map<string, Blob>;
  team: Team;
  /** Invitaciones que se pueden abrir con su token. */
  invitations: Map<string, InvitationLookup>;
  /** Links de recuperación que todavía sirven. */
  resetTokens: Set<string>;
  /** Refresh tokens que se revocaron con `/auth/logout`, y cuántas veces se cerró todo. */
  loggedOut: string[];
  loggedOutEverywhere: number;
}

/** Estado mutable de los mocks: deja que un test (o el browser) recorra un flujo completo. */
export const mockState: MockState = createInitialState();

function createInitialState(): MockState {
  return {
    businesses: [mockBusiness],
    connection: { status: mockGoogleConnection.status, connectedAt: mockGoogleConnection.connectedAt },
    importedLocationNames: new Set([mockImportedLocation.googleName]),
    manualLocations: [],
    reviews: mockReviews.map((review) => ({ ...review })),
    campaigns: mockCampaigns.map((campaign) => ({ ...campaign })),
    locationsWithoutReviewUrl: new Set<string>(),
    inactiveLocations: new Set<string>(),
    replySuggestions: 'ok',
    scanWeeks: [...mockScanWeeks],
    logos: new Map(),
    team: { members: mockTeam.members.map((member) => ({ ...member })), invitations: [] },
    invitations: new Map([
      [
        mockInvitationToken,
        {
          status: 'PENDING',
          email: 'nueva@opinara.test',
          role: 'MEMBER',
          businessName: mockBusiness.name,
          invitedByName: 'Dueño de prueba',
          accountExists: false,
        },
      ],
    ]),
    resetTokens: new Set([mockResetToken]),
    loggedOut: [],
    loggedOutEverywhere: 0,
  };
}

export function resetMockState(): void {
  Object.assign(mockState, createInitialState());
}

/** Atajos para que cada test arme el escenario que necesita sin tocar la forma del estado. */
export const givenMock = {
  /** Cambia la invitación de prueba (estado, email, si ya hay cuenta). */
  invitation: (changes: Partial<InvitationLookup>) => {
    const current = mockState.invitations.get(mockInvitationToken);
    if (current !== undefined) mockState.invitations.set(mockInvitationToken, { ...current, ...changes });
  },
  /** El negocio de prueba con un logo ya cargado. */
  logo: (image: Blob = new Blob(['logo'], { type: 'image/png' }), updatedAt = '2026-10-01T12:00:00.000Z') => {
    mockState.businesses = mockState.businesses.map((business) =>
      business.urn === mockBusiness.urn ? { ...business, logoUpdatedAt: updatedAt } : business,
    );
    mockState.logos.set(mockBusiness.slug, image);
  },
  noBusinesses: () => {
    mockState.businesses = [];
  },
  businesses: (businesses: (typeof mockBusiness)[]) => {
    mockState.businesses = businesses;
  },
  connection: (status: ConnectionStatus | null) => {
    mockState.connection = status === null ? null : { status, connectedAt: mockGoogleConnection.connectedAt };
  },
  noImportedLocations: () => {
    mockState.importedLocationNames = new Set();
  },
  reviews: (reviews: typeof mockReviews) => {
    mockState.reviews = reviews.map((review) => ({ ...review }));
  },
  replySuggestions: (outcome: MockState['replySuggestions']) => {
    mockState.replySuggestions = outcome;
  },
  scanWeeks: (weeks: number[]) => {
    mockState.scanWeeks = [...weeks];
  },
  campaigns: (campaigns: typeof mockCampaigns) => {
    mockState.campaigns = campaigns.map((campaign) => ({ ...campaign }));
  },
  locationWithoutReviewUrl: (locationUrn: string) => {
    mockState.locationsWithoutReviewUrl.add(locationUrn);
  },
  locationInactive: (locationUrn: string) => {
    mockState.inactiveLocations.add(locationUrn);
  },
};
