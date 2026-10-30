import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { removeLogo, uploadLogo } from './api/businesses-api';
import { type Business } from './api/schemas';

/** Subir o quitar el logo. La respuesta es el negocio actualizado: se reemplaza en la lista. */
export function useBusinessLogo(businessUrn: string) {
  const queryClient = useQueryClient();

  const replace = (updated: Business) => {
    queryClient.setQueryData<Business[]>(queryKeys.businesses(), (current) =>
      current?.map((business) => (business.urn === updated.urn ? updated : business)),
    );
  };

  const upload = useMutation({
    mutationFn: (image: Blob) => uploadLogo(businessUrn, image),
    onSuccess: replace,
  });

  const remove = useMutation({
    mutationFn: () => removeLogo(businessUrn),
    onSuccess: replace,
  });

  return { upload, remove };
}
