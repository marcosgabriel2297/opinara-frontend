import { AlertTriangleIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage, t } from '@/i18n';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/** Estado de error estándar: el texto siempre sale del `errorCode`, nunca del `message` del backend. */
export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>{title ?? t.common.somethingWentWrong}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>{errorMessage(error)}</p>
        {onRetry !== undefined && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t.common.retry}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
