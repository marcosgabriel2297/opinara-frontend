import { ExternalLinkIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { type Location } from '@/features/locations/api/schemas';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Las reseñas de la sucursal en Google, donde el dueño las responde con su propia cuenta.
 *
 * Existe porque publicar desde Opinara necesita que Google apruebe el acceso a la API, y mientras
 * tanto es la única forma de responder. Google no tiene un link para responder *una* reseña: se
 * abre la lista del local y, si quien la abre administra el perfil, cada reseña muestra
 * "Responder". Se arma con el Place ID, igual que el link para dejar reseña del QR, así que anda
 * también con las sucursales cargadas a mano.
 */
function googleReviewsUrl(placeId: string): string {
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`;
}

interface ReplyOnGoogleLinkProps {
  location: Location | undefined;
  variant?: 'default' | 'outline';
  className?: string;
}

export function ReplyOnGoogleLink({ location, variant = 'outline', className }: ReplyOnGoogleLinkProps) {
  if (location?.placeId === undefined) return null;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <a
        href={googleReviewsUrl(location.placeId)}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(buttonVariants({ variant }), 'w-fit lg:w-full')}
      >
        {t.reviews.replyOnGoogle.action}
        <span className="sr-only">{t.reviews.replyOnGoogle.newTab}</span>
        <ExternalLinkIcon aria-hidden className="size-3.5" />
      </a>
      <p className="text-muted-foreground text-xs">{t.reviews.replyOnGoogle.hint}</p>
    </div>
  );
}
