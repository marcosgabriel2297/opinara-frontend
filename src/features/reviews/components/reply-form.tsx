import { CheckCircle2Icon, SparklesIcon } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';

import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GoogleReconnectAlert } from '@/features/google/components/google-error-state';
import { needsGoogleReconnect } from '@/features/google/reconnect';
import { errorMessage, plural, t } from '@/i18n';
import { formatDate } from '@/lib/format';

import { MAX_REPLY_LENGTH, type Review } from '../api/schemas';
import { useDeleteReply, useReplyToReview, useReviewsSummary, useSuggestReply } from '../queries';
import { clearReplyDraft, readReplyDraft, saveReplyDraft } from '../reply-draft';

interface ReplyFormProps {
  businessUrn: string;
  review: Review;
  /** El listado tal como se dejó: a dónde invita a volver después de publicar. */
  backTo: string;
}

/**
 * Responder y editar son la misma pantalla: el endpoint es `PUT` y crea o pisa la respuesta
 * indistintamente, igual que `updateReply` de Google. Tener dos formularios sería inventar una
 * distinción que la API no hace.
 */
export function ReplyForm({ businessUrn, review, backTo }: ReplyFormProps) {
  const toast = useToast();
  // Mientras corre el "Deshacer" de un borrado, la respuesta ya se muestra como borrada.
  const [deleting, setDeleting] = useState(false);
  const existing = deleting ? undefined : review.reply?.comment;
  const isEditing = existing !== undefined;

  // Un borrador sin publicar gana sobre la respuesta guardada: es lo último que la persona escribió.
  const [draft] = useState(() => readReplyDraft(review.urn));
  const [comment, setComment] = useState(draft ?? existing ?? '');
  const [touched, setTouched] = useState(false);

  const replyMutation = useReplyToReview(businessUrn, review.locationUrn, review.urn);
  const deleteMutation = useDeleteReply(businessUrn, review.locationUrn, review.urn);

  // La sugerencia con IA solo se ofrece si el servidor la tiene configurada, y para responder: sobre
  // una respuesta ya publicada pisaría lo que el negocio eligió decir.
  const suggestionsEnabled = useReviewsSummary(businessUrn).data?.replySuggestions === true;
  const suggest = useSuggestReply(businessUrn);
  const [suggested, setSuggested] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Al terminar bien, el foco va al mensaje: si no, queda en `body` (el botón que lo tenía se
  // deshabilita o desaparece) y quien usa teclado o lector de pantalla pierde dónde estaba.
  const statusRef = useRef<HTMLDivElement>(null);
  const succeeded = replyMutation.isSuccess;
  useEffect(() => {
    if (succeeded) statusRef.current?.focus();
  }, [succeeded]);

  /**
   * Borrar sin preguntar, con "Deshacer": la respuesta desaparece del formulario en el acto y
   * recién se borra en Google cuando se cierra el aviso. Si falla, vuelve a aparecer con el error.
   */
  const startDelete = () => {
    const previous = comment;
    replyMutation.reset();
    deleteMutation.reset();
    setDeleting(true);
    setComment('');
    toast.undoable({
      message: t.reviews.reply.deleted,
      onUndo: () => {
        setDeleting(false);
        setComment(previous);
      },
      run: () => {
        deleteMutation.mutate(undefined, {
          onSuccess: () => {
            clearReplyDraft(review.urn);
            setDeleting(false);
          },
          onError: () => {
            setDeleting(false);
            setComment(previous);
          },
        });
      },
    });
  };

  const changeComment = (next: string) => {
    setComment(next);
    // Se guarda en cada cambio (así sobrevive a salir de la pantalla); si quedó igual que lo
    // publicado, no hay borrador que guardar.
    if (next === (existing ?? '')) clearReplyDraft(review.urn);
    else saveReplyDraft(review.urn, next);
  };

  /** Pone la sugerencia en el texto para revisarla: no publica nada. */
  const applySuggestion = () => {
    if (suggest.isPending) return;
    suggest.mutate(
      { locationUrn: review.locationUrn, reviewUrn: review.urn },
      {
        onSuccess: (text) => {
          changeComment(text);
          setSuggested(true);
          textareaRef.current?.focus();
        },
      },
    );
  };

  const trimmed = comment.trim();
  const tooLong = trimmed.length > MAX_REPLY_LENGTH;
  const empty = trimmed.length === 0;
  const error = tooLong ? t.reviews.reply.tooLong : touched && empty ? t.reviews.reply.required : undefined;

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setTouched(true);
    if (empty || tooLong) return;

    deleteMutation.reset();
    // El borrador se borra solo si se publicó: si falla, lo escrito sigue ahí para reintentar.
    replyMutation.mutate(trimmed, {
      onSuccess: () => {
        clearReplyDraft(review.urn);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{isEditing ? t.reviews.reply.editTitle : t.reviews.reply.title}</h2>
        </CardTitle>
        {/* La fecha que antes estaba en la tarjeta (ahora la respuesta solo se ve acá). */}
        {review.reply?.updatedAt !== undefined && (
          <CardDescription>
            {t.reviews.replyPublishedOn.replace('{date}', formatDate(review.reply.updatedAt) ?? '')}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="grid gap-4">
        {succeeded && (
          <Alert ref={statusRef} variant="success" role="status" tabIndex={-1}>
            <CheckCircle2Icon aria-hidden />
            <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {t.reviews.reply.published}
              {/* El paso siguiente de la tarea: volver al listado como se dejó (filtros y página). */}
              <Link viewTransition to={backTo} className="font-medium underline underline-offset-4">
                {t.reviews.reply.backToList}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {replyMutation.isError && <ActionError error={replyMutation.error} />}

        {deleteMutation.isError && <ActionError error={deleteMutation.error} />}

        {draft !== null && !succeeded && !deleting && (
          <p className="text-muted-foreground text-sm">{t.reviews.reply.draftRestored}</p>
        )}

        <form onSubmit={submit} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label htmlFor="reply">{t.reviews.reply.label}</Label>
            {suggestionsEnabled && !isEditing && (
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
            id="reply"
            rows={6}
            value={comment}
            maxLength={MAX_REPLY_LENGTH}
            onChange={(event) => {
              changeComment(event.target.value);
            }}
            onBlur={() => {
              setTouched(true);
            }}
            placeholder={t.reviews.reply.placeholder}
            aria-invalid={error !== undefined}
            aria-describedby={error === undefined ? 'reply-remaining' : 'reply-error'}
          />

          {error === undefined ? (
            <p id="reply-remaining" className="text-muted-foreground text-xs" aria-live="polite">
              {suggested && !succeeded
                ? t.reviews.suggestion.ready
                : plural(MAX_REPLY_LENGTH - trimmed.length, t.reviews.reply.remaining)}
            </p>
          ) : (
            <p id="reply-error" role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          {suggest.isError && (
            <Alert variant="warning">
              <AlertDescription>{errorMessage(suggest.error)}</AlertDescription>
            </Alert>
          )}

          {/* La acción principal primero; borrar, separada y al final, nunca al lado de publicar. */}
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={replyMutation.isPending || empty || tooLong}>
              {replyMutation.isPending
                ? t.reviews.reply.submitting
                : isEditing
                  ? t.reviews.reply.submitEdit
                  : t.reviews.reply.submit}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hover:text-destructive ml-auto"
                disabled={deleteMutation.isPending}
                onClick={startDelete}
              >
                {deleteMutation.isPending ? t.reviews.reply.deleting : t.reviews.reply.delete}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Si falló porque se cortó la conexión con Google, reintentar no sirve: se ofrece reconectar (el
 * mismo aviso que las pantallas de Google). Cualquier otro error, como siempre: solo el mensaje.
 */
function ActionError({ error }: { error: unknown }) {
  if (needsGoogleReconnect(error)) return <GoogleReconnectAlert error={error} />;

  return (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  );
}
