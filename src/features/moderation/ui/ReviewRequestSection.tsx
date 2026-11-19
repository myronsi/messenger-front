import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { formatDate } from '@/shared/utils/dateFormatters';
import { toast } from '@/shared/ui/sonner';
import { type AccountStatus, useRequestAccountReviewMutation } from '../api/moderationApi';
import { MAX_REVIEW_TEXT } from '../model/accountStatus';

interface ReviewRequestSectionProps {
  status: AccountStatus;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined);

export const ReviewRequestSection = ({ status }: ReviewRequestSectionProps) => {
  const { translations, language } = useLanguage();
  const t = translations.moderation;
  const [text, setText] = useState('');
  const [requestReview, { isLoading }] = useRequestAccountReviewMutation();
  const requestedAt = status.review_requested_at;
  const allowed = status.can_request_review;

  const submit = async () => {
    try {
      await requestReview(text.trim()).unwrap();
      setText('');
      toast(t.reviewSent);
    } catch (caught) {
      const code = statusOf(caught);
      toast(code === 409 ? t.reviewAlreadyOpen : code === 429 ? t.reviewTooMany : t.reviewFailed);
    }
  };

  if (requestedAt) {
    return (
      <section className="space-y-2 rounded-lg border border-border p-4" data-testid="review-request-sent">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-success" />{t.reviewSentTitle}
        </h3>
        <p role="status" className="text-sm text-muted-foreground">
          {fillTemplate(t.reviewSentDescription, { date: formatDate(requestedAt, language) })}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{t.reviewTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.reviewExplanation}</p>
      <label className="block text-sm font-medium" htmlFor="review-text">{t.reviewTextLabel}</label>
      <textarea id="review-text" value={text} maxLength={MAX_REVIEW_TEXT} rows={3} placeholder={t.reviewTextPlaceholder} disabled={!allowed}
        onChange={(event) => setText(event.target.value.slice(0, MAX_REVIEW_TEXT))}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50" />
      <p className="text-right text-xs text-muted-foreground">{fillTemplate(t.noteCounter, { count: String(text.length) })}</p>
      <button type="button" onClick={() => void submit()} disabled={!allowed || isLoading || !text.trim()}
        className="motion-press rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        {t.reviewButton}
      </button>
      {!allowed && <p className="text-xs text-muted-foreground">{t.reviewUnavailable}</p>}
    </section>
  );
};
