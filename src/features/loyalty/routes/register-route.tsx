import { ArrowLeftIcon, GiftIcon, MessageCircleIcon, ScanLineIcon, StampIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { ErrorState } from '@/components/error-state';
import { FullPageLoader } from '@/components/full-page-loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { hasFeature } from '@/features/businesses/api/schemas';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { errorMessage, t } from '@/i18n';
import { isApiError } from '@/lib/http';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { type LoyaltyActionResult, type LoyaltyMember, type LoyaltyProgram } from '../api/schemas';
import { LoyaltyUpsell } from '../components/loyalty-upsell';
import { QrScanner } from '../components/qr-scanner';
import { StampDots } from '../components/stamp-dots';
import { formatMemberCode, memberCodeFromQr } from '../member-code';
import { useCardLink, useMemberByCode, useMembers, usePrograms, useRegisterActions } from '../queries';
import { whatsAppUrl } from '../whatsapp';
import { readRegisterProgram, writeRegisterProgram } from '../register-storage';

/**
 * La caja: pensada para usarse muchas veces por día, con una mano y apurado. Pantalla completa,
 * botones grandes y el resultado de cada acción bien visible, con "Deshacer" por si fue un error.
 *
 * La sucursal se elige una vez por dispositivo: la tarjeta de un cliente vale solo en la suya.
 */
export default function RegisterRoute() {
  const business = useCurrentBusiness();
  const included = hasFeature(business, 'LOYALTY');
  const programsQuery = usePrograms(business.urn, included);
  const [programUrn, setProgramUrn] = useState<string | null>(() => readRegisterProgram(business.urn));

  const choose = (urn: string | null) => {
    setProgramUrn(urn);
    writeRegisterProgram(business.urn, urn);
  };

  if (!included) {
    return (
      <RegisterShell>
        <LoyaltyUpsell />
      </RegisterShell>
    );
  }
  if (programsQuery.isPending) return <FullPageLoader />;
  if (programsQuery.isError) {
    return (
      <RegisterShell>
        <ErrorState error={programsQuery.error} onRetry={() => void programsQuery.refetch()} />
      </RegisterShell>
    );
  }

  // Si la guardada ya no existe (la borraron, o el dispositivo cambió de negocio), se vuelve a elegir.
  // Con una sola sucursal con tarjeta no hay nada que preguntar.
  const programs = programsQuery.data;
  const program =
    programs.find((candidate) => candidate.urn === programUrn) ?? (programs.length === 1 ? programs[0] : undefined);

  if (program === undefined) {
    return (
      <RegisterShell>
        <ChooseProgram programs={programs} onChoose={choose} />
      </RegisterShell>
    );
  }

  return (
    <RegisterShell
      header={
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-lg font-semibold">
            {t.loyalty.register.at.replace('{location}', program.location.title)}
          </h1>
          {programs.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                choose(null);
              }}
            >
              {t.loyalty.register.change}
            </Button>
          )}
        </div>
      }
    >
      <Register key={program.urn} program={program} />
    </RegisterShell>
  );
}

function RegisterShell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl content-start gap-5 px-4 pt-4 pb-10">
      <Link
        to={paths.loyalty}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t.loyalty.register.exit}
      </Link>
      {header}
      {children}
    </main>
  );
}

function ChooseProgram({ programs, onChoose }: { programs: LoyaltyProgram[]; onChoose: (urn: string) => void }) {
  if (programs.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t.loyalty.register.noPrograms}</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="grid gap-3" aria-labelledby="choose-title">
      <div className="grid gap-1">
        <h1 id="choose-title" className="text-xl font-semibold">
          {t.loyalty.register.chooseLocation}
        </h1>
        <p className="text-muted-foreground text-sm">{t.loyalty.register.chooseHint}</p>
      </div>
      <div className="grid gap-2">
        {programs.map((program) => (
          <Button
            key={program.urn}
            variant="outline"
            size="lg"
            className="h-14 justify-start text-base"
            onClick={() => {
              onChoose(program.urn);
            }}
          >
            {program.location.title}
          </Button>
        ))}
      </div>
    </section>
  );
}

/** Buscar o escanear, y lo que se hace con la tarjeta elegida. */
function Register({ program }: { program: LoyaltyProgram }) {
  const business = useCurrentBusiness();
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const debounced = useDebouncedValue(search.trim());
  // Celular, nombre o código de la tarjeta: el backend busca de todas las formas.
  const membersQuery = useMembers(business.urn, debounced === '' ? null : program.urn, {
    search: debounced,
    limit: 8,
  });

  const select = (code: string) => {
    setMemberCode(code);
    setScanning(false);
    setScanNotice(null);
  };

  const next = () => {
    setMemberCode(null);
    setSearch('');
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  if (memberCode !== null) {
    return <MemberPanel program={program} memberCode={memberCode} onDone={next} />;
  }

  return (
    <div className="grid gap-5">
      {scanning ? (
        <QrScanner
          onResult={(content) => {
            const code = memberCodeFromQr(content);
            if (code === null) setScanNotice(t.loyalty.register.notACard);
            else select(code);
          }}
          onClose={() => {
            setScanning(false);
          }}
        />
      ) : (
        <Button
          size="lg"
          className="h-16 text-lg"
          onClick={() => {
            setScanNotice(null);
            setScanning(true);
          }}
        >
          <ScanLineIcon aria-hidden className="size-6" />
          {t.loyalty.register.scan}
        </Button>
      )}
      {scanNotice !== null && (
        <p role="status" className="text-destructive text-center text-sm">
          {scanNotice}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="register-search">{t.loyalty.register.searchLabel}</Label>
        <Input
          id="register-search"
          ref={searchRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={t.loyalty.register.searchPlaceholder}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          className="h-12 text-base"
        />
        <p className="text-muted-foreground text-xs">{t.loyalty.register.searchHint}</p>
      </div>

      {debounced !== '' && (
        <div aria-live="polite">
          {membersQuery.isFetching && membersQuery.data === undefined && <Spinner label={t.common.loading} />}
          {membersQuery.data?.items.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {t.loyalty.register.noResults.replace('{search}', debounced)}
            </p>
          )}
          {membersQuery.data !== undefined && membersQuery.data.items.length > 0 && (
            <ul className="grid gap-2">
              {membersQuery.data.items.map((member) => (
                <li key={member.urn}>
                  <button
                    type="button"
                    onClick={() => {
                      select(member.memberCode);
                    }}
                    className="bg-card hover:bg-accent flex min-h-14 w-full items-center justify-between gap-3 rounded-md border px-4 py-2 text-left"
                  >
                    <span className="grid min-w-0">
                      <span className="truncate font-medium">{member.name}</span>
                      <span className="text-muted-foreground text-sm tabular-nums">{member.phone}</span>
                    </span>
                    <StampDots stamps={member.stamps} total={member.stampsRequired} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type LastAction = { kind: 'stamp' | 'redeem'; result: LoyaltyActionResult } | { kind: 'undone' };

/** La tarjeta elegida: sumar, canjear, deshacer, o el link nuevo si perdió el suyo. */
function MemberPanel({
  program,
  memberCode,
  onDone,
}: {
  program: LoyaltyProgram;
  memberCode: string;
  onDone: () => void;
}) {
  const business = useCurrentBusiness();
  const memberQuery = useMemberByCode(business.urn, memberCode);
  const actions = useRegisterActions(business.urn);
  const [last, setLast] = useState<LastAction | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const canUndo = useUndoWindow(last);

  if (memberQuery.isPending) return <Spinner label={t.common.loading} />;
  if (memberQuery.isError) {
    return (
      <div className="grid gap-4">
        <Alert
          variant={isApiError(memberQuery.error) && memberQuery.error.statusCode === 404 ? 'warning' : 'destructive'}
        >
          <AlertDescription>{errorMessage(memberQuery.error)}</AlertDescription>
        </Alert>
        <Button size="lg" variant="outline" onClick={onDone}>
          {t.loyalty.register.next}
        </Button>
      </div>
    );
  }

  const detail = memberQuery.data;
  const otherLocation = detail.program.urn !== program.urn;
  // Lo último que respondió el backend manda: la consulta se refresca un instante después.
  const member: LoyaltyMember = last !== null && last.kind !== 'undone' ? last.result.member : detail;
  const paused = program.status !== 'ACTIVE' || !program.location.isActive;
  const busy = actions.stamp.isPending || actions.redeem.isPending || actions.undo.isPending;

  const run = async (kind: 'stamp' | 'redeem') => {
    setActionError(null);
    try {
      const mutation = kind === 'stamp' ? actions.stamp : actions.redeem;
      const result = await mutation.mutateAsync({ programUrn: program.urn, memberCode: detail.memberCode });
      setLast({ kind, result });
    } catch (error) {
      setActionError(error);
    }
  };

  const undo = async () => {
    if (last === null || last.kind === 'undone') return;
    setActionError(null);
    try {
      await actions.undo.mutateAsync(last.result.event.urn);
      setLast({ kind: 'undone' });
    } catch (error) {
      setActionError(error);
    }
  };

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="grid gap-4">
          <div className="grid gap-0.5">
            <p className="text-2xl font-semibold">{member.name}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {member.phone} · {formatMemberCode(member.memberCode)}
            </p>
          </div>
          <StampDots stamps={member.stamps} total={member.stampsRequired} size="lg" />
          <p className="text-lg font-medium tabular-nums">
            {t.loyalty.register.progress
              .replace('{count}', String(member.stamps))
              .replace('{total}', String(member.stampsRequired))}
          </p>
          {member.rewardAvailable && !otherLocation && (
            <p className="bg-brand-soft text-brand-strong flex items-center gap-2 rounded-md px-3 py-2 font-semibold">
              <GiftIcon aria-hidden className="size-5" />
              {t.loyalty.register.rewardAvailable} {program.rewardDescription}
            </p>
          )}
        </CardContent>
      </Card>

      {otherLocation ? (
        <Alert variant="warning">
          <AlertTitle>
            {t.loyalty.register.otherLocation.replace('{location}', detail.program.locationTitle)}
          </AlertTitle>
          <AlertDescription>{t.loyalty.register.otherLocationBody}</AlertDescription>
        </Alert>
      ) : paused ? (
        <Alert variant="warning">
          <AlertDescription>{t.loyalty.register.paused}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" className="h-16 text-lg" disabled={busy} onClick={() => void run('stamp')}>
            <StampIcon aria-hidden className="size-6" />
            {t.loyalty.register.addStamp}
          </Button>
          <Button
            size="lg"
            variant={member.rewardAvailable ? 'default' : 'outline'}
            className="h-16 text-lg"
            disabled={busy || !member.rewardAvailable}
            onClick={() => void run('redeem')}
          >
            <GiftIcon aria-hidden className="size-6" />
            {t.loyalty.register.redeem}
          </Button>
        </div>
      )}

      <div aria-live="polite" className="grid gap-3">
        {last !== null && <LastActionNotice last={last} program={program} />}
        {canUndo && (
          <Button variant="outline" disabled={busy} onClick={() => void undo()}>
            {t.loyalty.register.undo}
          </Button>
        )}
        {actionError !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(actionError)}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button size="lg" variant={last === null ? 'outline' : 'default'} className="h-14" onClick={onDone}>
        {t.loyalty.register.next}
      </Button>

      {!otherLocation && <SendCard member={detail} />}
    </div>
  );
}

function LastActionNotice({ last, program }: { last: LastAction; program: LoyaltyProgram }) {
  if (last.kind === 'undone') {
    return <p className="text-center font-medium">{t.loyalty.register.undone}</p>;
  }

  const { member, rewardReached } = last.result;
  const text =
    last.kind === 'redeem'
      ? t.loyalty.register.redeemed.replace('{reward}', program.rewardDescription)
      : rewardReached
        ? t.loyalty.register.rewardReached.replace('{reward}', program.rewardDescription)
        : t.loyalty.register.stamped
            .replace('{count}', String(member.stamps))
            .replace('{total}', String(member.stampsRequired));

  return (
    <p
      className={
        rewardReached || last.kind === 'redeem'
          ? 'bg-primary text-primary-foreground rounded-lg px-4 py-4 text-center text-xl font-semibold'
          : 'bg-brand-soft text-brand-strong rounded-lg px-4 py-3 text-center text-lg font-semibold'
      }
    >
      {text}
    </p>
  );
}

/** "Deshacer" se ve mientras el backend lo permite (`undoableUntil`) y se esconde solo al vencer. */
function useUndoWindow(last: LastAction | null): boolean {
  const until =
    last !== null && last.kind !== 'undone' && last.result.event.urn !== ''
      ? Date.parse(last.result.event.undoableUntil)
      : null;
  const [expired, setExpired] = useState<number | null>(null);

  useEffect(() => {
    if (until === null) return;
    const timer = window.setTimeout(
      () => {
        setExpired(until);
      },
      Math.max(0, until - Date.now()),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [until]);

  // Si ya venció al llegar, el timer de 0 ms lo esconde en el próximo ciclo.
  return until !== null && expired !== until;
}

/**
 * Mandarle la tarjeta al cliente: por WhatsApp, desde el WhatsApp del local (en el celular o en
 * WhatsApp Web), o como QR para que lo escanee. Es el link actual: no se cambia, así no se rompe la
 * tarjeta que el cliente ya tenga guardada.
 */
function SendCard({ member }: { member: Pick<LoyaltyMember, 'memberCode' | 'name' | 'phone'> }) {
  const business = useCurrentBusiness();
  const linkQuery = useCardLink(business.urn, member.memberCode, true);
  const [showQr, setShowQr] = useState(false);
  const r = t.loyalty.register;

  if (linkQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(linkQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const link = linkQuery.data;
  const message =
    link === undefined
      ? ''
      : r.whatsAppMessage
          .replace('{name}', member.name.split(' ')[0] ?? member.name)
          .replace('{business}', business.name)
          .replace('{url}', link.cardUrl);

  return (
    <div className="grid gap-2 border-t pt-4">
      {link === undefined ? (
        <Button variant="outline" disabled>
          <MessageCircleIcon aria-hidden />
          {r.sendWhatsApp}
        </Button>
      ) : (
        <Button asChild variant="outline">
          <a href={whatsAppUrl(member.phone, message)} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon aria-hidden />
            {r.sendWhatsApp}
          </a>
        </Button>
      )}
      <p className="text-muted-foreground text-center text-xs">{r.sendWhatsAppHint}</p>

      {showQr && link !== undefined ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 text-center">
            <img
              src={link.pngDataUrl}
              alt={r.cardLinkAlt.replace('{name}', member.name)}
              width={512}
              height={512}
              className="w-56 [image-rendering:pixelated]"
            />
            <p className="text-muted-foreground text-sm">{r.cardLinkHint}</p>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="ghost"
          disabled={link === undefined}
          onClick={() => {
            setShowQr(true);
          }}
        >
          {r.cardLink}
        </Button>
      )}
    </div>
  );
}
