import { t } from '@/i18n';
import { formatRelativeDays } from '@/lib/format';

import { type Review } from '../api/schemas';

/**
 * Cómo se va a ver la respuesta publicada, con la tipografía y los grises neutros de Google (no los
 * de Opinara): es una imitación de su ficha, para que no haya sorpresas al publicar.
 */
export function GooglePreview({ review, reply }: { review: Review; reply: string }) {
  const name = review.reviewer.isAnonymous ? t.reviews.anonymous : (review.reviewer.displayName ?? t.reviews.anonymous);
  const text = reply.trim();

  return (
    <section aria-labelledby="google-preview-title" className="grid gap-3">
      <h2 id="google-preview-title" className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
        {t.reviews.queue.previewTitle}
      </h2>
      <div className="grid gap-3 rounded-lg border bg-white p-4 font-[Arial,sans-serif] text-[#202124]">
        <div className="grid">
          <span className="text-sm">{name}</span>
          <span className="text-xs text-[#5f6368]">{formatRelativeDays(review.createdAt)}</span>
        </div>
        {review.comment !== undefined && <p className="text-sm leading-relaxed">{review.comment}</p>}
        <div className="grid gap-1 border-l-[3px] border-[#dadce0] pl-3">
          <span className="text-[0.8125rem] font-bold">{t.reviews.queue.previewOwner}</span>
          <span className="text-[0.8125rem] leading-relaxed whitespace-pre-line text-[#3c4043]">
            {text === '' ? t.reviews.queue.previewEmpty : text}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{t.reviews.queue.previewHint}</p>
    </section>
  );
}
