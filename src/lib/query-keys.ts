/**
 * Claves de TanStack Query en un solo lugar: así una invalidación no se olvida de una pantalla
 * y no hay dos módulos escribiendo la misma clave con formas distintas.
 */
export const queryKeys = {
  businesses: () => ['businesses'] as const,
  business: (businessUrn: string) => ['businesses', businessUrn] as const,
  team: (businessUrn: string) => ['businesses', businessUrn, 'team'] as const,

  googleConnection: (businessUrn: string) => ['businesses', businessUrn, 'google', 'connection'] as const,
  googleAccounts: (businessUrn: string) => ['businesses', businessUrn, 'google', 'accounts'] as const,
  googleLocations: (businessUrn: string, accountName: string) =>
    ['businesses', businessUrn, 'google', 'locations', accountName] as const,

  locations: (businessUrn: string) => ['businesses', businessUrn, 'locations'] as const,

  reviews: (businessUrn: string, locationUrn: string, filters: Record<string, unknown>) =>
    ['businesses', businessUrn, 'locations', locationUrn, 'reviews', filters] as const,
  review: (businessUrn: string, locationUrn: string, reviewUrn: string) =>
    ['businesses', businessUrn, 'locations', locationUrn, 'reviews', reviewUrn] as const,

  campaigns: (businessUrn: string) => ['businesses', businessUrn, 'campaigns'] as const,
  campaign: (businessUrn: string, campaignUrn: string) =>
    ['businesses', businessUrn, 'campaigns', campaignUrn] as const,
  /**
   * Fuera de `campaigns` a propósito: invalidar la lista (al crear una campaña) no tiene por qué
   * volver a pedir los QR, que no cambian.
   */
  campaignQr: (businessUrn: string, campaignUrn: string) => ['businesses', businessUrn, 'qr', campaignUrn] as const,

  /**
   * Las del negocio entero y su resumen, bajo la misma raíz que las de cada sucursal: responder,
   * borrar o sincronizar los actualizan solos.
   */
  businessReviews: (businessUrn: string, filters: Record<string, unknown>) =>
    ['businesses', businessUrn, 'locations', '*', 'reviews', filters] as const,
  reviewsSummary: (businessUrn: string) => ['businesses', businessUrn, 'locations', '*', 'summary'] as const,

  /** `campaignUrn` `null`: todas las campañas del negocio. */
  scans: (businessUrn: string, campaignUrn: string | null, weeks: number) =>
    ['businesses', businessUrn, 'scans', campaignUrn ?? '*', weeks] as const,

  /** Tarjeta de sellos. Todo bajo `loyalty`: un sello o un canje invalidan programas y clientes de una. */
  loyalty: (businessUrn: string) => ['businesses', businessUrn, 'loyalty'] as const,
  loyaltyPrograms: (businessUrn: string) => ['businesses', businessUrn, 'loyalty', 'programs'] as const,
  loyaltyProgram: (businessUrn: string, programUrn: string) =>
    ['businesses', businessUrn, 'loyalty', 'programs', programUrn] as const,
  loyaltyMembers: (businessUrn: string, programUrn: string, filters: Record<string, unknown>) =>
    ['businesses', businessUrn, 'loyalty', 'members', programUrn, filters] as const,
  loyaltyReminders: (businessUrn: string, filters: Record<string, unknown>) =>
    ['businesses', businessUrn, 'loyalty', 'reminders', filters] as const,
  loyaltyMember: (businessUrn: string, memberCode: string) =>
    ['businesses', businessUrn, 'loyalty', 'member', memberCode] as const,
  /** Fuera de `loyalty`, como el de campañas: un sello no cambia el QR impreso. */
  loyaltyProgramQr: (businessUrn: string, programUrn: string) =>
    ['businesses', businessUrn, 'loyalty-qr', programUrn] as const,

  /** Lo público, sin negocio ni sesión. */
  loyaltySignup: (businessSlug: string, programSlug: string) =>
    ['public', 'loyalty', businessSlug, programSlug] as const,
  loyaltyCard: (token: string) => ['public', 'loyalty', 'card', token] as const,

  /** Raíz de todas las reseñas del negocio: sirve para invalidar de una. */
  allReviews: (businessUrn: string) => ['businesses', businessUrn, 'locations'] as const,
};
