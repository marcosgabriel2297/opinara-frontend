import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Button } from '@/components/ui/button';
import { errorMessage, t } from '@/i18n';
import { isApiError } from '@/lib/http';

import { paths } from './paths';

/** Última red de contención: cualquier error no manejado de una ruta cae acá. */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <Shell title={t.errors.routeNotFoundTitle} body={t.errors.routeNotFoundBody} />;
  }

  return (
    <Shell title={t.errors.boundaryTitle} body={isApiError(error) ? errorMessage(error) : t.errors.boundaryBody} />
  );
}

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Button asChild>
        <Link viewTransition to={paths.home}>
          {t.errors.goHome}
        </Link>
      </Button>
    </div>
  );
}
