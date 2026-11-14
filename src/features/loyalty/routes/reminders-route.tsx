import { BellIcon, BellOffIcon, MessageCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router';

import { paths } from '@/app/paths';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { hasFeature } from '@/features/businesses/api/schemas';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { errorMessage, plural, t } from '@/i18n';
import { formatRelativeDays } from '@/lib/format';

import { type LoyaltyReminder, type LoyaltyReminderReason } from '../api/schemas';
import { LoyaltyUpsell } from '../components/loyalty-upsell';
import { StampDots } from '../components/stamp-dots';
import { useMarkReminderSent, usePrograms, useReminders, useSetMemberReminders } from '../queries';
import { whatsAppUrl } from '../whatsapp';

const PAGE_SIZE = 20;

/**
 * Los recordatorios recomendados: clientes a los que les faltan 1 o 2
 * sellos y que no vinieron hoy, o que hace un tiempo que no vienen. El local los manda uno por uno desde su WhatsApp; al abrirlo, el
 * cliente sale de la lista hasta su próximo sello. Solo OWNER y ADMIN.
 */
export default function RemindersRoute() {
  const business = useCurrentBusiness();
  const included = hasFeature(business, 'LOYALTY');
  const canManage = business.role === 'OWNER' || business.role === 'ADMIN';
  const [programUrn, setProgramUrn] = useState('');
  const [reason, setReason] = useState<LoyaltyReminderReason | ''>('');
  const [page, setPage] = useState(0);
  const programsQuery = usePrograms(business.urn, included && canManage);
  const remindersQuery = useReminders(
    business.urn,
    {
      programUrn: programUrn === '' ? undefined : programUrn,
      reason: reason === '' ? undefined : reason,
      page,
      limit: PAGE_SIZE,
    },
    included && canManage,
  );
  const r = t.loyalty.reminders;

  const header = <PageHeader title={r.title} description={r.subtitle} back={{ to: paths.loyalty, label: r.back }} />;

  if (!included) {
    return (
      <>
        {header}
        <LoyaltyUpsell />
      </>
    );
  }
  if (!canManage) return <Navigate to={paths.loyalty} replace />;
  if (remindersQuery.isError) {
    return (
      <>
        {header}
        <ErrorState error={remindersQuery.error} onRetry={() => void remindersQuery.refetch()} />
      </>
    );
  }

  const programs = programsQuery.data ?? [];
  const data = remindersQuery.data;

  return (
    <>
      {header}
      <div className="grid max-w-3xl gap-4">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="reminders-reason">{r.reasonFilter}</Label>
            <NativeSelect
              id="reminders-reason"
              className="w-full sm:w-60"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as LoyaltyReminderReason | '');
                setPage(0);
              }}
            >
              <option value="">{r.allReasons}</option>
              {(['NEAR_REWARD', 'INACTIVE'] as const).map((value) => (
                <option key={value} value={value}>
                  {r.reason[value]}
                </option>
              ))}
            </NativeSelect>
          </div>
          {programs.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="reminders-location">{r.locationFilter}</Label>
              <NativeSelect
                id="reminders-location"
                className="w-full sm:w-72"
                value={programUrn}
                onChange={(event) => {
                  setProgramUrn(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">{r.allLocations}</option>
                {programs.map((program) => (
                  <option key={program.urn} value={program.urn}>
                    {program.location.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>

        {data === undefined ? (
          <Spinner label={t.common.loading} />
        ) : data.total === 0 ? (
          <EmptyState icon={<BellIcon aria-hidden />} title={r.emptyTitle} description={r.emptyBody} />
        ) : (
          <>
            <ul className="grid gap-3">
              {data.items.map((reminder) => (
                <li key={reminder.member.urn}>
                  <ReminderCard reminder={reminder} showLocation={programs.length > 1} />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              limit={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
              disabled={remindersQuery.isFetching}
            />
          </>
        )}
      </div>
    </>
  );
}

function ReminderCard({ reminder, showLocation }: { reminder: LoyaltyReminder; showLocation: boolean }) {
  const business = useCurrentBusiness();
  const markSent = useMarkReminderSent(business.urn);
  const setReminders = useSetMemberReminders(business.urn);
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const { member } = reminder;
  const r = t.loyalty.reminders;
  const lastStamp = formatRelativeDays(member.lastStampAt ?? undefined);

  // Es un link de verdad (se abre aunque falle lo de abajo); al tocarlo se anota como enviado.
  const onSend = () => {
    setError(null);
    markSent.mutate(member.memberCode, {
      onSuccess: () => {
        toast.show({ message: r.sent.replace('{name}', member.name) });
      },
      onError: setError,
    });
  };

  // Lo pidió el cliente (por ejemplo, respondiendo el WhatsApp): no se le recomienda más.
  const onOptOut = () => {
    setError(null);
    setReminders.mutate(
      { memberCode: member.memberCode, enabled: false },
      {
        onSuccess: () => {
          toast.show({ message: r.optedOut.replace('{name}', member.name) });
        },
        onError: setError,
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{member.name}</p>
              <Badge variant={reminder.reason === 'NEAR_REWARD' ? 'success' : 'outline'}>
                {r.reason[reminder.reason]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {[
                ...(reminder.reason === 'NEAR_REWARD'
                  ? [
                      plural(reminder.missingStamps, r.missing),
                      lastStamp !== undefined ? r.lastStamp.replace('{when}', lastStamp) : null,
                    ]
                  : member.lastStampAt === null
                    ? [plural(reminder.daysSinceVisit, r.neverCame)]
                    : [
                        plural(reminder.daysSinceVisit, r.inactiveFor),
                        r.progress
                          .replace('{count}', String(member.stamps))
                          .replace('{total}', String(member.stampsRequired)),
                      ]),
                showLocation ? reminder.program.locationTitle : null,
              ]
                .filter((part) => part !== null)
                .join(' · ')}
            </p>
          </div>
          <StampDots stamps={member.stamps} total={member.stampsRequired} />
        </div>

        <p className="bg-muted rounded-lg px-4 py-3 text-sm break-words whitespace-pre-line">{reminder.message}</p>

        {error !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-1.5 sm:flex sm:items-center sm:gap-3">
          <Button asChild>
            <a
              href={whatsAppUrl(member.phone, reminder.message)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={r.sendLabel.replace('{name}', member.name)}
              onClick={onSend}
            >
              <MessageCircleIcon aria-hidden />
              {r.send}
            </a>
          </Button>
          <p className="text-muted-foreground text-xs sm:flex-1">{r.sendHint}</p>
          <Button
            variant="ghost"
            className="justify-self-start"
            aria-label={r.optOutLabel.replace('{name}', member.name)}
            disabled={setReminders.isPending}
            onClick={onOptOut}
          >
            <BellOffIcon aria-hidden />
            {r.optOut}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
