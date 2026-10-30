import { ImageUpIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/i18n';
import { errorMessage } from '@/i18n/error-message';

import { type Business } from '../api/schemas';
import { logoUrl } from '../logo';
import { LOGO_ACCEPT, LogoError, prepareLogo } from '../prepare-logo';
import { useBusinessLogo } from '../queries';

/**
 * El logo del negocio, en Configuración. La imagen se prepara en el navegador (se achica y se
 * pasa a WebP o PNG) antes de subirla. Quitarlo se deshace, no se confirma: el aviso queda unos
 * segundos y recién al cerrarse se borra.
 */
export function LogoSettings({ business }: { business: Business }) {
  const canEdit = business.role === 'OWNER' || business.role === 'ADMIN';
  const { upload, remove } = useBusinessLogo(business.urn);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const url = removing ? null : logoUrl(business);
  const busy = preparing || upload.isPending || remove.isPending;

  const choose = async (file: File | undefined) => {
    if (file === undefined) return;
    setError(null);
    setPreparing(true);
    try {
      const image = await prepareLogo(file);
      setPreparing(false);
      await upload.mutateAsync(image);
      toast.show({ message: t.businesses.logo.saved });
    } catch (cause) {
      setError(cause instanceof LogoError ? t.businesses.logo.errors[cause.reason] : errorMessage(cause));
    } finally {
      setPreparing(false);
    }
  };

  const startRemove = () => {
    setError(null);
    setRemoving(true);
    toast.undoable({
      message: t.businesses.logo.removed,
      run: () => {
        remove.mutate(undefined, {
          onError: (cause) => {
            setError(errorMessage(cause));
          },
          onSettled: () => {
            setRemoving(false);
          },
        });
      },
      onUndo: () => {
        setRemoving(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.businesses.logo.title}</h2>
        </CardTitle>
        <CardDescription>{t.businesses.logo.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* La vista previa sobre blanco, como en la hoja impresa. */}
          <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg border bg-white p-3">
            {url === null ? (
              <BrandMark className="size-10 opacity-60" />
            ) : (
              <img
                src={url}
                alt={t.businesses.logo.previewAlt.replace('{name}', business.name)}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          <div className="grid min-w-0 flex-1 basis-56 gap-3">
            <p className="text-muted-foreground text-sm">
              {url === null ? t.businesses.logo.emptyHint : t.businesses.logo.formats}
            </p>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={url === null ? 'default' : 'outline'}
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  <ImageUpIcon aria-hidden />
                  {busy && !remove.isPending
                    ? t.businesses.logo.uploading
                    : url === null
                      ? t.businesses.logo.upload
                      : t.businesses.logo.replace}
                </Button>
                {url !== null && (
                  <Button type="button" variant="outline" disabled={busy} onClick={startRemove}>
                    {t.businesses.logo.remove}
                  </Button>
                )}
                <input
                  ref={input}
                  type="file"
                  accept={LOGO_ACCEPT}
                  hidden
                  aria-label={t.businesses.logo.upload}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Vaciarlo deja volver a elegir el mismo archivo después de un error.
                    event.target.value = '';
                    void choose(file);
                  }}
                />
              </div>
            ) : (
              <p className="text-sm">{t.businesses.logo.readOnly}</p>
            )}
          </div>
        </div>

        {error !== null && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
