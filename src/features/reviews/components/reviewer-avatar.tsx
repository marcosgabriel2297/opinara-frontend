import { UserIcon } from 'lucide-react';
import { useState } from 'react';

import { t } from '@/i18n';

import { type Review } from '../api/schemas';

/** Hasta dos iniciales: "Ana Pérez" → "AP". */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase('es-AR') ?? '')
    .join('');
}

/**
 * Quién dejó la reseña.
 *
 * Una reseña anónima llega **sin nombre y sin foto**: no se asume que `displayName` exista.
 * Y si la foto que manda Google no carga (borrada, hotlink bloqueado, sin conexión), se cae a las
 * iniciales en vez de dejar el ícono de imagen rota. Las iniciales hacen que cada persona sea
 * distinguible al recorrer la lista; el anónimo queda con el ícono genérico.
 */
export function ReviewerAvatar({ reviewer, showName = true }: { reviewer: Review['reviewer']; showName?: boolean }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  const known = !reviewer.isAnonymous && reviewer.displayName !== undefined;
  const name = known ? (reviewer.displayName ?? t.reviews.anonymous) : t.reviews.anonymous;
  const photo = reviewer.isAnonymous || photoFailed ? undefined : reviewer.profilePhotoUrl;

  return (
    <span className="flex min-w-0 items-center gap-3">
      {photo !== undefined ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          onError={() => {
            setPhotoFailed(true);
          }}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : known ? (
        <span
          aria-hidden
          className="bg-brand-soft text-brand-strong flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        >
          {initialsOf(name)}
        </span>
      ) : (
        <span
          aria-hidden
          className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          <UserIcon className="size-4" />
        </span>
      )}
      {showName && <span className="truncate font-medium">{name}</span>}
    </span>
  );
}
