import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

export default function NotFoundRoute() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t.errors.routeNotFoundTitle}</h1>
      <p className="text-muted-foreground">{t.errors.routeNotFoundBody}</p>
      <Button asChild>
        <Link viewTransition to={paths.home}>
          {t.errors.goHome}
        </Link>
      </Button>
    </div>
  );
}
