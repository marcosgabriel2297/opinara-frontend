import { api } from '@/lib/http';

import {
  campaignSchema,
  campaignsSchema,
  generatedQrSchema,
  scansByWeekSchema,
  type Campaign,
  type GeneratedQr,
  type ScansByWeek,
} from './schemas';

const base = (businessUrn: string) => `/businesses/${encodeURIComponent(businessUrn)}/campaigns`;

/** Sin paginación: devuelve el array completo. */
export function listCampaigns(businessUrn: string): Promise<Campaign[]> {
  return api.get(base(businessUrn), { schema: campaignsSchema });
}

export function getCampaign(businessUrn: string, campaignUrn: string): Promise<Campaign> {
  return api.get(`${base(businessUrn)}/${encodeURIComponent(campaignUrn)}`, { schema: campaignSchema });
}

export interface CreateCampaignInput {
  name: string;
  locationUrn: string;
  slug?: string;
}

export function createCampaign(businessUrn: string, input: CreateCampaignInput): Promise<Campaign> {
  return api.post(base(businessUrn), { body: input, schema: campaignSchema });
}

/** Genera (o regenera) el QR. Requiere OWNER o ADMIN. */
export function generateQr(businessUrn: string, campaignUrn: string): Promise<GeneratedQr> {
  return api.post(`${base(businessUrn)}/${encodeURIComponent(campaignUrn)}/qr`, { schema: generatedQrSchema });
}

/** Escaneos por semana: de una campaña o, con `campaignUrn` `null`, de todo el negocio. */
export function getScansByWeek(businessUrn: string, campaignUrn: string | null, weeks: number): Promise<ScansByWeek> {
  const path =
    campaignUrn === null
      ? `/businesses/${encodeURIComponent(businessUrn)}/scans`
      : `${base(businessUrn)}/${encodeURIComponent(campaignUrn)}/scans`;
  return api.get(path, { query: { weeks }, schema: scansByWeekSchema });
}
