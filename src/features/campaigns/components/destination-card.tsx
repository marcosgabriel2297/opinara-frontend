import { AlertTriangleIcon, ExternalLinkIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/i18n';

import { type Destination, isLocalOnlyUrl } from '../destination';

interface DestinationCardProps {
  businessName: string;
  destination: Destination;
  /** La URL que codifica el QR (la arma el backend). */
  targetUrl: string;
}

/**
 * A dónde lleva el QR, para comprobarlo antes de imprimir: el negocio, la sucursal y la página de
 * reseñas de Google a la que termina llevando.
 *
 * El link a Google va **directo** a `googleReviewUrl` (la misma URL a la que redirige el backend),
 * no a `/r/...`: así se puede revisar el destino sin sumar un escaneo a las métricas.
 */
export function DestinationCard({ businessName, destination, targetUrl }: DestinationCardProps) {
  const copy = t.campaigns.detail.destination;
  const location = destination.location;

  return (
    <Card className="no-imprimir">
      <CardHeader>
        <CardTitle asChild>
          <h2>{copy.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-4">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{copy.business}</dt>
            <dd className="font-medium">{businessName}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{copy.location}</dt>
            <dd className="font-medium">{location?.title ?? t.campaigns.locationMissing}</dd>
            {location?.address !== undefined && <dd className="text-muted-foreground">{location.address}</dd>}
          </div>
          {destination.ok && (
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">{copy.google}</dt>
              <dd>
                <a
                  href={destination.reviewUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                >
                  {copy.googleLink}
                  <ExternalLinkIcon aria-hidden className="size-3.5" />
                </a>
              </dd>
              <dd className="text-muted-foreground">{copy.googleHint}</dd>
            </div>
          )}
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{copy.qrUrl}</dt>
            <dd className="font-mono break-all">{targetUrl}</dd>
            <dd className="text-muted-foreground">{copy.qrUrlHint}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Aviso de que el QR apunta a una dirección que solo existe en esta computadora. Va arriba de las
 * acciones, no al pie del destino: tiene que leerse antes de imprimir.
 */
export function LocalUrlWarning({ targetUrl }: { targetUrl: string }) {
  if (!isLocalOnlyUrl(targetUrl)) return null;
  const copy = t.campaigns.detail.destination;

  return (
    <Alert variant="warning" className="no-imprimir">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>{copy.localTitle}</AlertTitle>
      <AlertDescription>{copy.localBody.replace('{host}', hostOf(targetUrl))}</AlertDescription>
    </Alert>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
