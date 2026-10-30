import { ArrowRightIcon, BuildingIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { t } from '@/i18n';

import { GoogleErrorState } from '../components/google-error-state';
import { Steps } from '../components/steps';
import { useGoogleAccounts } from '../queries';

/** Paso 2: elegir de qué cuenta de Google Business Profile traer las sucursales. */
export default function GoogleAccountsRoute() {
  const business = useCurrentBusiness();
  const navigate = useNavigate();
  const accountsQuery = useGoogleAccounts(business.urn, true);

  return (
    <>
      <PageHeader
        title={t.google.accounts.title}
        description={t.google.accounts.description}
        back={{ to: paths.google, label: t.google.locations.backToGoogle }}
      />
      <Steps current={2} />

      <div className="grid max-w-3xl gap-4">
        {accountsQuery.isPending && (
          <>
            <Spinner label={t.common.loading} />
            <Skeleton className="h-20 w-full" />
          </>
        )}

        {accountsQuery.isError && (
          <GoogleErrorState error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} />
        )}

        {accountsQuery.data?.length === 0 && (
          <EmptyState title={t.google.accounts.empty} icon={<BuildingIcon aria-hidden />} />
        )}

        {accountsQuery.data !== undefined && accountsQuery.data.length > 0 && (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {accountsQuery.data.map((account) => (
                <li key={account.name} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
                  <div className="grid min-w-0 gap-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {account.displayName}
                      {account.verificationState === 'VERIFIED' && (
                        <Badge variant="success">{t.google.accounts.verified}</Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate font-mono text-xs">{account.name}</p>
                  </div>

                  <Button
                    onClick={() => {
                      void navigate(paths.googleLocations(account.name), { viewTransition: true });
                    }}
                  >
                    {t.google.accounts.choose}
                    <ArrowRightIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
