import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { type Business } from '../api/schemas';
import { logoUrl } from '../logo';

interface BusinessLogoProps {
  business: Pick<Business, 'name' | 'slug' | 'logoUpdatedAt'>;
  /** Lo que se muestra sin logo, o si no carga. */
  fallback: ReactNode;
  className?: string;
}

/**
 * El logo del negocio, sin recortar ni deformar (`object-contain`): un logo apaisado ocupa el
 * ancho, uno cuadrado el alto. El tamaño lo da `className` (alto y ancho máximos).
 */
export function BusinessLogo({ business, fallback, className }: BusinessLogoProps) {
  const url = logoUrl(business);
  if (url === null) return fallback;

  // `key`: con un logo nuevo, un error del anterior no lo esconde.
  return <LogoImage key={url} url={url} alt={`Logo de ${business.name}`} fallback={fallback} className={className} />;
}

function LogoImage({
  url,
  alt,
  fallback,
  className,
}: {
  url: string;
  alt: string;
  fallback: ReactNode;
  className: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;

  return (
    <img
      src={url}
      alt={alt}
      decoding="async"
      onError={() => {
        setFailed(true);
      }}
      className={cn('block w-auto object-contain object-left', className)}
    />
  );
}
