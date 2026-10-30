import { z } from 'zod';

export const campaignStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignSchema = z.object({
  urn: z.string(),
  name: z.string(),
  slug: z.string(),
  /** El QR apunta a una sucursal concreta: el link de Google es por sucursal. */
  locationUrn: z.string(),
  status: campaignStatusSchema,
  stats: z.object({
    /** Aperturas de la landing pública. */
    scans: z.number(),
    /**
     * Redirecciones hacia Google. El backend lo incrementa junto con `scans` en cada escaneo,
     * así que no es una medición distinta: se valida (es parte del contrato) pero no se muestra.
     */
    googleClicks: z.number(),
  }),
  /** Lo que el QR codifica. Apunta al frontend, no a la API. */
  targetUrl: z.string(),
  createdAt: z.string().optional(),
});

export type Campaign = z.infer<typeof campaignSchema>;

export const campaignsSchema = z.array(campaignSchema);

export const generatedQrSchema = z.object({
  targetUrl: z.string(),
  /** `data:image/png;base64,…`, listo para `<img>` y para descargar. */
  pngDataUrl: z.string(),
});

export type GeneratedQr = z.infer<typeof generatedQrSchema>;

export const scansByWeekSchema = z.object({
  /** De la semana más vieja a la actual; `week` es el lunes (`YYYY-MM-DD`) en la zona del negocio. */
  weeks: z.array(z.object({ week: z.string(), scans: z.number() })),
  /** Desde cuándo hay escaneos con fecha. Los anteriores están en el total pero no acá. */
  trackedSince: z.string().nullable(),
});

export type ScansByWeek = z.infer<typeof scansByWeekSchema>;
