import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import * as campaignsApi from './api/campaigns-api';
import { type CreateCampaignInput } from './api/campaigns-api';

export function useCampaigns(businessUrn: string) {
  return useQuery({
    queryKey: queryKeys.campaigns(businessUrn),
    queryFn: () => campaignsApi.listCampaigns(businessUrn),
  });
}

export function useCampaign(businessUrn: string, campaignUrn: string) {
  return useQuery({
    queryKey: queryKeys.campaign(businessUrn, campaignUrn),
    queryFn: () => campaignsApi.getCampaign(businessUrn, campaignUrn),
  });
}

export function useCreateCampaign(businessUrn: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) => campaignsApi.createCampaign(businessUrn, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(businessUrn) }),
  });
}

/**
 * El QR de la campaña, pedido al abrir el detalle.
 *
 * Es un POST, pero idempotente: la URL que codifica depende solo de los slugs del negocio y de la
 * campaña, y el backend actualiza el mismo registro (`createOrUpdate`). Por eso se puede tratar como
 * una lectura y cachear: una sola llamada por campaña y por sesión (`staleTime`/`gcTime` infinitos),
 * y StrictMode no la duplica porque dos montajes comparten la misma query.
 *
 * `enabled` lo decide la pantalla: solo OWNER/ADMIN (el backend lo exige) y solo si la campaña
 * tiene un destino válido. Un QR que llevaría a "no disponible" no se genera.
 */
export function useCampaignQr(businessUrn: string, campaignUrn: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.campaignQr(businessUrn, campaignUrn),
    queryFn: () => campaignsApi.generateQr(businessUrn, campaignUrn),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    // Sin reintentos automáticos (la política global reintenta los 5xx): si falla, un solo POST y
    // la pantalla ofrece "Reintentar".
    retry: false,
  });
}

export const SCAN_WEEKS = 12;

export function useScansByWeek(businessUrn: string, campaignUrn: string | null) {
  return useQuery({
    queryKey: queryKeys.scans(businessUrn, campaignUrn, SCAN_WEEKS),
    queryFn: () => campaignsApi.getScansByWeek(businessUrn, campaignUrn, SCAN_WEEKS),
  });
}
