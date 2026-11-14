import { useQueries } from '@tanstack/react-query';
import { GiftIcon, MessageCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage, plural, t } from '@/i18n';
import { isApiError } from '@/lib/http';
import { queryKeys } from '@/lib/query-keys';

import { getCard } from '../api/public-loyalty-api';
import { type LoyaltyCard } from '../api/schemas';
import { cardTokenFromHash, forgetCardToken, readCardTokens, rememberCardToken } from '../card-storage';
import { PublicShell } from '../components/public-shell';
import { StampDots } from '../components/stamp-dots';
import { formatMemberCode } from '../member-code';
import { useCard, useDeleteCard, useSetCardReminders } from '../queries';
import { whatsAppUrl } from '../whatsapp';

const cardHref = (token: string) => `${paths.loyaltyCard}#token=${token}`;

/**
 * La tarjeta del cliente. El link (`/card#token=…`) es la tarjeta: se guarda en el teléfono para que
 * `/card` a secas siga andando, y si hay varias guardadas se elige cuál ver.
 */
export default function CardRoute() {
  const location = useLocation();
  const { hash } = location;
  // Recién dada de alta (viene del formulario): se ofrece guardar el link antes que nada.
  const registered = (location.state as { registered?: boolean } | null)?.registered === true;
  const navigate = useNavigate();
  const token = cardTokenFromHash(hash);
  const [stored] = useState(readCardTokens);

  useEffect(() => {
    if (token !== null) rememberCardToken(token);
  }, [token]);

  // Sin link pero con una sola guardada: directo a esa, con el link en la URL (es lo que guarda el
  // "Agregar a inicio").
  const only = token === null && stored.length === 1 ? stored[0] : undefined;
  useEffect(() => {
    if (only !== undefined) void navigate(cardHref(only), { replace: true });
  }, [only, navigate]);

  if (token !== null) return <Card token={token} registered={registered} />;
  if (stored.length > 1) return <ChooseCard tokens={stored} />;
  if (only !== undefined) {
    return (
      <PublicShell>
        <Spinner label={t.common.loading} />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <Message title={t.loyalty.card.noCardsTitle} body={t.loyalty.card.noCardsBody} />
    </PublicShell>
  );
}

function Card({ token, registered }: { token: string; registered: boolean }) {
  const cardQuery = useCard(token);
  const [deleted, setDeleted] = useState(false);
  const notFound = isApiError(cardQuery.error) && cardQuery.error.statusCode === 404;

  useEffect(() => {
    if (notFound || deleted) forgetCardToken(token);
  }, [notFound, deleted, token]);

  if (deleted) {
    return (
      <PublicShell>
        <Message title={t.loyalty.card.deletedTitle} body={t.loyalty.card.deletedBody} />
      </PublicShell>
    );
  }
  if (cardQuery.isPending) {
    return (
      <PublicShell>
        <Spinner label={t.common.loading} />
      </PublicShell>
    );
  }
  if (cardQuery.isError) {
    return (
      <PublicShell>
        {notFound ? (
          <Message title={t.loyalty.card.notFoundTitle} body={t.loyalty.card.notFoundBody} />
        ) : (
          <Alert variant="destructive">
            <AlertDescription className="grid gap-3">
              <p>{errorMessage(cardQuery.error)}</p>
              <Button variant="outline" onClick={() => void cardQuery.refetch()}>
                {t.common.retry}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </PublicShell>
    );
  }

  return (
    <CardView
      card={cardQuery.data}
      token={token}
      registered={registered}
      onDeleted={() => {
        setDeleted(true);
      }}
    />
  );
}

function CardView({
  card,
  token,
  registered,
  onDeleted,
}: {
  card: LoyaltyCard;
  token: string;
  registered: boolean;
  onDeleted: () => void;
}) {
  const { member, program } = card;
  const remaining = Math.max(0, program.stampsRequired - member.stamps);
  const c = t.loyalty.card;

  return (
    <PublicShell business={card.business} subtitle={card.location.title}>
      {registered && (
        <section className="bg-brand-soft grid gap-3 rounded-xl p-4" aria-labelledby="card-welcome-title">
          <h1 id="card-welcome-title" className="text-brand-strong font-semibold">
            {c.welcomeTitle}
          </h1>
          <p className="text-sm">{c.welcomeBody}</p>
          <SendToMe card={card} token={token} />
        </section>
      )}

      <section className="bg-card grid justify-items-center gap-4 rounded-xl border p-5 text-center shadow-sm">
        <p className="text-lg font-semibold">{member.name}</p>
        <StampDots stamps={member.stamps} total={program.stampsRequired} size="lg" className="justify-center" />
        <p className="font-medium tabular-nums">
          {c.progress.replace('{count}', String(member.stamps)).replace('{total}', String(program.stampsRequired))}
        </p>
        <div aria-live="polite">
          {member.rewardAvailable ? (
            <p className="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-3 font-semibold">
              <GiftIcon aria-hidden className="size-5 shrink-0" />
              {c.rewardReady.replace('{reward}', program.rewardDescription)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {plural(remaining, c.remaining).replace('{reward}', program.rewardDescription)}
            </p>
          )}
        </div>
        {!program.active && (
          <Alert variant="warning">
            <AlertDescription>{c.paused}</AlertDescription>
          </Alert>
        )}
      </section>

      <section className="grid justify-items-center gap-2 text-center" aria-labelledby="card-qr-title">
        <h2 id="card-qr-title" className="font-medium">
          {c.showAtRegister}
        </h2>
        {/* Blanco siempre, aunque el teléfono esté en modo oscuro: es lo que lee la cámara de la caja. */}
        <div className="rounded-xl bg-white p-3">
          <img
            src={member.qrPngDataUrl}
            alt={c.qrAlt}
            width={512}
            height={512}
            className="w-56 [image-rendering:pixelated]"
          />
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">{c.code}: </span>
          <span className="font-mono text-lg font-semibold tracking-widest">{formatMemberCode(member.memberCode)}</span>
        </p>
        {member.totalRedemptions > 0 && (
          <p className="text-muted-foreground text-sm">{plural(member.totalRedemptions, c.redemptions)}</p>
        )}
      </section>

      {program.terms !== null && (
        <section className="grid gap-1 text-sm">
          <h2 className="font-medium">{c.terms}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{program.terms}</p>
        </section>
      )}

      <details className="bg-card rounded-lg border px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">{c.keepTitle}</summary>
        <ul className="text-muted-foreground mt-2 grid gap-1.5">
          <li>{c.keepIos}</li>
          <li>{c.keepAndroid}</li>
          <li>{c.keepLink}</li>
        </ul>
        {!registered && (
          <div className="mt-3">
            <SendToMe card={card} token={token} />
          </div>
        )}
      </details>

      <RemindersToggle card={card} token={token} />
      <MyData card={card} token={token} onDeleted={onDeleted} />
    </PublicShell>
  );
}

/**
 * El link de la tarjeta al propio WhatsApp ("Mensaje para vos"): así no se pierde aunque se borre el
 * navegador. Se arma con el link de esta misma página, que es la tarjeta.
 */
function SendToMe({ card, token }: { card: LoyaltyCard; token: string }) {
  const c = t.loyalty.card;
  const url = `${window.location.origin}${cardHref(token)}`;
  const message = c.sendToMeMessage
    .replace('{business}', card.business.name)
    .replace('{location}', card.location.title)
    .replace('{url}', url);

  return (
    <div className="grid gap-1.5">
      <Button asChild size="touch">
        <a href={whatsAppUrl(card.member.phone, message)} target="_blank" rel="noopener noreferrer">
          <MessageCircleIcon aria-hidden />
          {c.sendToMe}
        </a>
      </Button>
      <p className="text-muted-foreground text-xs">{c.sendToMeHint}</p>
    </div>
  );
}

/**
 * Los recordatorios del local por WhatsApp ("te falta poco para el premio"). Se guarda al tocar: si
 * los apaga acá, el local no los puede volver a prender.
 */
function RemindersToggle({ card, token }: { card: LoyaltyCard; token: string }) {
  const mutation = useSetCardReminders(token);
  const c = t.loyalty.card;
  const enabled = mutation.isPending ? mutation.variables : card.member.remindersEnabled;

  return (
    <section aria-labelledby="card-reminders" className="bg-card grid gap-2 rounded-lg border px-4 py-3 text-sm">
      <h2 id="card-reminders" className="font-medium">
        {c.remindersTitle}
      </h2>
      <label className="flex items-start gap-3">
        <Checkbox
          className="mt-0.5 size-5"
          checked={enabled}
          disabled={mutation.isPending}
          onChange={(event) => {
            mutation.mutate(event.target.checked);
          }}
        />
        <span>{c.remindersLabel.replace('{business}', card.business.name)}</span>
      </label>
      <p aria-live="polite" className="text-muted-foreground text-xs">
        {mutation.isSuccess ? (mutation.data ? c.remindersOn : c.remindersOff) : null}
      </p>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}

/** Ver los datos que guardamos y borrarlos, con una confirmación: no se puede deshacer. */
function MyData({ card, token, onDeleted }: { card: LoyaltyCard; token: string; onDeleted: () => void }) {
  const deleteMutation = useDeleteCard();
  const [confirming, setConfirming] = useState(false);
  const c = t.loyalty.card;

  return (
    <details className="bg-card rounded-lg border px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">{c.myData}</summary>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">{c.name}</dt>
        <dd>{card.member.name}</dd>
        <dt className="text-muted-foreground">{c.phone}</dt>
        <dd className="tabular-nums">{card.member.phone}</dd>
        <dt className="text-muted-foreground">{c.email}</dt>
        <dd className="[overflow-wrap:anywhere]">{card.member.email ?? c.noEmail}</dd>
      </dl>
      <div className="mt-4 grid gap-2">
        {confirming ? (
          <>
            <p role="alert">{c.deleteConfirm}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(token, { onSuccess: onDeleted });
                }}
              >
                {deleteMutation.isPending ? c.deleting : c.deleteConfirmAction}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {t.common.cancel}
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {c.deleteData}
          </Button>
        )}
        {deleteMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(deleteMutation.error)}</AlertDescription>
          </Alert>
        )}
      </div>
    </details>
  );
}

/** Varias tarjetas en el mismo teléfono (de varias sucursales o comercios): se elige cuál ver. */
function ChooseCard({ tokens }: { tokens: string[] }) {
  const cards = useQueries({
    queries: tokens.map((token) => ({
      queryKey: queryKeys.loyaltyCard(token),
      queryFn: () => getCard(token),
      retry: false,
    })),
  });

  return (
    <PublicShell>
      <h1 className="text-xl font-semibold">{t.loyalty.card.chooseTitle}</h1>
      <ul className="grid gap-2">
        {tokens.map((token, index) => {
          const card = cards[index]?.data;
          if (card === undefined) return null;
          return (
            <li key={token}>
              <Link
                to={cardHref(token)}
                className="bg-card hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <span className="grid min-w-0">
                  <span className="truncate font-medium">{card.business.name}</span>
                  <span className="text-muted-foreground truncate text-sm">{card.location.title}</span>
                </span>
                <StampDots stamps={card.member.stamps} total={card.program.stampsRequired} />
              </Link>
            </li>
          );
        })}
      </ul>
      {cards.some((query) => query.isPending) && <Spinner label={t.common.loading} />}
    </PublicShell>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-2 pt-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
