import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { BrandMark } from '@/components/brand-mark';
import { ErrorState } from '@/components/error-state';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentBusiness } from '@/features/businesses/use-business';
import { GoogleReconnectAlert } from '@/features/google/components/google-error-state';
import { needsGoogleReconnect } from '@/features/google/reconnect';
import { useLocations } from '@/features/locations/queries';
import { errorMessage, plural, t } from '@/i18n';

import { MAX_REPLY_LENGTH, type Review } from '../api/schemas';
import { GooglePreview } from '../components/google-preview';
import { ReviewQuote } from '../components/review-quote';
import { useQueueReply, useReplyQueue, useReviewsSummary, useSuggestReply } from '../queries';
import { clearReplyDraft, readReplyDraft, saveReplyDraft } from '../reply-draft';

/** Un paso hecho, para poder deshacerlo: a qué reseña volver y si se publicó algo. */
interface Step {
  index: number;
  published: boolean;
}

/**
 * Modo foco: responder las reseñas pendientes de a una, la que más espera primero.
 *
 * La fila se toma una vez al entrar (ver `useReplyQueue`) y queda fija: publicar invalida las
 * reseñas, y si la fila se rearmara sola, la que se está leyendo cambiaría de lugar.
 *
 * "Deshacer" después de publicar borra la respuesta en Google (la publicación ya ocurrió: no se
 * finge una demora) y vuelve a esa reseña con el texto, para corregirlo.
 */
export default function ReplyQueueRoute() {
  const business = useCurrentBusiness();
  const queueQuery = useReplyQueue(business.urn);
  const summaryQuery = useReviewsSummary(business.urn);
  const locationsQuery = useLocations(business.urn);

  // La fila fija: se toma la primera vez que llega (patrón de estado derivado en render).
  const [queue, setQueue] = useState<Review[] | null>(null);
  if (queue === null && queueQuery.data !== undefined) setQueue(queueQuery.data.items);

  if (queue === null) {
    return (
      <QueueShell progress={null}>
        {queueQuery.isError ? (
          <div className="mx-auto w-full max-w-2xl px-4 py-10">
            <ErrorState error={queueQuery.error} onRetry={() => void queueQuery.refetch()} />
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
            <Spinner label={t.common.loading} />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </QueueShell>
    );
  }

  const locations = locationsQuery.data ?? [];
  const locationTitle =
    locations.length > 1 ? (urn: string) => locations.find((location) => location.urn === urn)?.title : () => undefined;

  return (
    <Queue
      businessUrn={business.urn}
      queue={queue}
      suggestions={summaryQuery.data?.replySuggestions === true}
      locationTitle={locationTitle}
    />
  );
}

function Queue({
  businessUrn,
  queue,
  suggestions,
  locationTitle,
}: {
  businessUrn: string;
  queue: Review[];
  suggestions: boolean;
  locationTitle: (urn: string) => string | undefined;
}) {
  const toast = useToast();
  const { publish, remove } = useQueueReply(businessUrn);
  const suggest = useSuggestReply(businessUrn);

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Step[]>([]);
  // El texto de cada reseña, empezando por lo que haya quedado guardado sin publicar.
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(queue.map((review) => [review.urn, readReplyDraft(review.urn) ?? ''])),
  );
  const [suggested, setSuggested] = useState<string | null>(null);

  const total = queue.length;
  const done = index >= total;
  const review = done ? undefined : queue[index];
  const draft = review === undefined ? '' : (drafts[review.urn] ?? '');
  const trimmed = draft.trim();
  const canPublish = trimmed !== '' && trimmed.length <= MAX_REPLY_LENGTH && !publish.isPending;
  const answered = history.filter((step) => step.published).length;

  // Al cambiar de reseña, el foco va al texto: se puede escribir sin tocar nada más.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [index]);

  const setDraft = (urn: string, text: string) => {
    setDrafts((current) => ({ ...current, [urn]: text }));
    if (text === '') clearReplyDraft(urn);
    else saveReplyDraft(urn, text);
  };

  const goTo = (next: number, published: boolean) => {
    setHistory((current) => [...current, { index, published }]);
    setIndex(next);
    setSuggested(null);
    publish.reset();
    suggest.reset();
  };

  const submit = (event?: SyntheticEvent) => {
    event?.preventDefault();
    if (review === undefined || !canPublish) return;

    publish.mutate(
      { locationUrn: review.locationUrn, reviewUrn: review.urn, comment: trimmed },
      {
        onSuccess: () => {
          clearReplyDraft(review.urn);
          goTo(index + 1, true);
          const name = review.reviewer.isAnonymous ? undefined : review.reviewer.displayName?.split(/\s+/)[0];
          toast.show({
            message:
              name === undefined
                ? t.reviews.queue.publishedAnonymous
                : t.reviews.queue.published.replace('{name}', name),
            action: { label: t.common.undo, onClick: () => undo(review, index) },
          });
        },
      },
    );
  };

  /** Borra en Google lo recién publicado y vuelve a esa reseña con el texto intacto. */
  const undo = (target: Review, targetIndex: number) => {
    toast.show({ message: t.reviews.queue.undoing });
    remove.mutate(
      { locationUrn: target.locationUrn, reviewUrn: target.urn },
      {
        onSuccess: () => {
          setHistory((current) => current.filter((step) => step.index !== targetIndex));
          setIndex(targetIndex);
          toast.show({ message: t.reviews.reply.deleted });
        },
        onError: () => {
          toast.show({ message: t.reviews.queue.undoFailed });
        },
      },
    );
  };

  const skip = () => {
    if (!done) goTo(index + 1, false);
  };

  const previous = () => {
    if (index === 0) return;
    setIndex(index - 1);
    setSuggested(null);
    publish.reset();
    suggest.reset();
  };

  const applySuggestion = () => {
    if (review === undefined) return;
    suggest.mutate(
      { locationUrn: review.locationUrn, reviewUrn: review.urn },
      {
        onSuccess: (text) => {
          setDraft(review.urn, text);
          setSuggested(review.urn);
          textareaRef.current?.focus();
        },
      },
    );
  };

  // Atajos: J y K se mueven (fuera del texto, para no robar letras); ⌘/Ctrl+Enter publica desde
  // cualquier lado. `useEffectEvent`: el listener ve siempre el estado actual sin resuscribirse.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    const typing = target?.closest('textarea, input, select, [contenteditable="true"]') != null;
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'j') skip();
    if (event.key === 'k') previous();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (total === 0 || review === undefined) {
    return (
      <QueueShell progress={total === 0 ? null : { current: total, total, done: true }}>
        <Finished answered={answered} skipped={history.length - answered} empty={total === 0} />
      </QueueShell>
    );
  }

  const remaining = MAX_REPLY_LENGTH - trimmed.length;

  return (
    <QueueShell progress={{ current: index + 1, total, done: false }}>
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-wrap items-start justify-center gap-x-14 gap-y-8 px-4 pt-8 pb-32 md:px-8 md:pt-14 lg:pb-14"
      >
        {/* El título de la pantalla, para lectores de pantalla: a la vista ya lo dice el avance. */}
        <h1 className="sr-only">{t.reviews.queue.title}</h1>
        <section aria-label={t.reviews.title} className="grid max-w-2xl min-w-0 flex-[1_1_32rem] gap-8">
          <ReviewQuote review={review} locationTitle={locationTitle(review.locationUrn)} size="lg" />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="queue-reply" className="text-sm font-semibold">
                {t.reviews.queue.label}
              </label>
              {suggestions && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applySuggestion}
                  aria-disabled={suggest.isPending}
                  className="bg-brand-soft text-brand-strong border-brand/25 rounded-full aria-disabled:opacity-60"
                >
                  <SparklesIcon aria-hidden />
                  {suggest.isPending ? t.reviews.suggestion.pending : t.reviews.suggestion.action}
                </Button>
              )}
            </div>

            <Textarea
              ref={textareaRef}
              id="queue-reply"
              rows={6}
              value={draft}
              maxLength={MAX_REPLY_LENGTH}
              placeholder={t.reviews.queue.placeholder}
              aria-describedby="queue-reply-hint"
              onChange={(event) => {
                setDraft(review.urn, event.target.value);
              }}
              className="text-base leading-relaxed md:text-[1.0625rem]"
            />

            <p id="queue-reply-hint" className="text-muted-foreground text-xs" aria-live="polite">
              {suggested === review.urn ? t.reviews.suggestion.ready : plural(remaining, t.reviews.reply.remaining)}
            </p>

            {suggest.isError && (
              <Alert variant="warning">
                <AlertDescription>{errorMessage(suggest.error)}</AlertDescription>
              </Alert>
            )}

            {publish.isError &&
              (needsGoogleReconnect(publish.error) ? (
                <GoogleReconnectAlert error={publish.error} />
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage(publish.error)}</AlertDescription>
                </Alert>
              ))}

            {/* En el teléfono, las acciones quedan fijas abajo: siempre a mano con el teclado abierto. */}
            <div className="bg-card fixed inset-x-0 bottom-0 z-10 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:z-auto md:flex md:flex-wrap md:items-center md:border-0 md:bg-transparent md:p-0">
              <Button type="button" variant="outline" size="lg" onClick={skip} className="md:order-2">
                <span className="md:hidden">{t.reviews.queue.skipShort}</span>
                <span className="max-md:hidden">{t.reviews.queue.skip}</span>
              </Button>
              <Button
                type="submit"
                size="lg"
                aria-disabled={!canPublish}
                className="aria-disabled:opacity-50 md:order-1"
              >
                {publish.isPending ? t.reviews.queue.publishing : t.reviews.queue.publish}
                <ArrowRightIcon aria-hidden />
              </Button>
              {index > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={previous}
                  className="max-md:hidden md:order-3"
                >
                  <ArrowLeftIcon aria-hidden />
                  {t.reviews.queue.previous}
                </Button>
              )}
            </div>
          </div>
        </section>

        <aside className="hidden w-80 shrink-0 lg:block">
          <GooglePreview review={review} reply={draft} />
        </aside>
      </form>
    </QueueShell>
  );
}

/** El marco del modo foco: salir, el avance y los atajos. Sin la navegación del dashboard. */
function QueueShell({
  progress,
  children,
}: {
  progress: { current: number; total: number; done: boolean } | null;
  children: ReactNode;
}) {
  const percent =
    progress === null
      ? 0
      : Math.round(((progress.done ? progress.total : progress.current - 1) / progress.total) * 100);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2.5 md:px-8">
        <Link
          viewTransition
          to={paths.home}
          className="text-muted-foreground hover:text-foreground -ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium"
        >
          <XIcon aria-hidden className="size-4" />
          {t.reviews.queue.exit}
        </Link>

        {progress !== null && (
          <div className="mx-auto grid w-full max-w-md min-w-40 flex-1 gap-1.5 max-sm:order-last max-sm:max-w-none">
            <p className="text-muted-foreground text-center text-sm font-medium tabular-nums" aria-live="polite">
              {progress.done
                ? t.reviews.queue.done
                : t.reviews.queue.progress
                    .replace('{current}', String(progress.current))
                    .replace('{total}', String(progress.total))}
            </p>
            <div
              role="progressbar"
              aria-label={t.reviews.queue.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="bg-border h-1 overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{ width: `${String(percent)}%` }}
              />
            </div>
          </div>
        )}

        <p
          className="text-muted-foreground ml-auto hidden items-center gap-4 text-xs lg:flex"
          aria-label={t.reviews.queue.shortcuts}
        >
          <span>
            <Kbd>J</Kbd> <Kbd>K</Kbd> {t.reviews.queue.shortcutMove}
          </span>
          <span>
            <Kbd>⌘ ↵</Kbd> {t.reviews.queue.shortcutPublish}
          </span>
        </p>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="bg-card text-foreground border-input/60 rounded border px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium">
      {children}
    </kbd>
  );
}

function Finished({ answered, skipped, empty }: { answered: number; skipped: number; empty: boolean }) {
  // El título recibe el foco: el botón de publicar desapareció y quien navega con teclado o lector
  // de pantalla tiene que enterarse de que terminó.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto grid max-w-xl flex-1 content-center justify-items-center gap-5 px-4 py-16 text-center">
      <BrandMark className="size-12" />
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-[2.75rem] leading-none tracking-[-0.02em] md:text-6xl"
      >
        {empty ? t.reviews.queue.emptyTitle : t.reviews.queue.doneTitle}
      </h1>
      <p className="text-muted-foreground text-lg text-balance">
        {empty
          ? t.reviews.queue.emptyBody
          : [
              plural(answered, t.reviews.queue.doneBody),
              skipped > 0 ? plural(skipped, t.reviews.queue.doneSkipped) : '',
            ]
              .filter(Boolean)
              .join(' ')}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link viewTransition to={paths.home}>
            {t.reviews.queue.backHome}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link viewTransition to={paths.reviews}>
            {t.reviews.queue.seeAll}
          </Link>
        </Button>
      </div>
    </div>
  );
}
