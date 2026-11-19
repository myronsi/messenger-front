import { useState } from 'react';
import { X } from 'lucide-react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import type { ContentReportRequest } from '@/entities/message';
import { useReportGroupMutation, useReportMessageMutation, type ContentReportReason } from '../api/moderationApi';
import { CONTENT_REPORT_REASONS, MAX_CONTENT_REPORT_NOTE } from '../model/accountStatus';

interface ReportContentDialogProps {
  request: ContentReportRequest;
  onClose: () => void;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined);

export const ReportContentDialog = ({ request, onClose }: ReportContentDialogProps) => {
  const t = useLanguage().translations.moderation;
  const [reason, setReason] = useState<ContentReportReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, messageState] = useReportMessageMutation();
  const [reportGroup, groupState] = useReportGroupMutation();
  const busy = messageState.isLoading || groupState.isLoading;
  const values = { name: request.name };
  const illegal = reason === 'illegal';
  const missingNote = illegal && !note.trim();
  const title = fillTemplate(request.kind === 'message' ? t.reportMessageTitle : t.reportGroupTitle, values);

  const submit = async () => {
    if (!reason || busy) return;
    if (missingNote) {
      setError(t.noteRequired);
      return;
    }
    setError(null);
    const body = { reason, note: note.trim() || null };
    try {
      if (request.kind === 'message') await reportMessage({ chatId: request.chatId, messageId: request.messageId, ...body }).unwrap();
      else await reportGroup({ chatId: request.chatId, ...body }).unwrap();
      toast(t.sent);
      onClose();
    } catch (caught) {
      const status = statusOf(caught);
      setError(status === 429 ? t.tooMany : status === 422 && illegal ? t.noteRequired : t.failed);
    }
  };

  return (
    <ModalSurface label={title}
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <form className="motion-panel-in relative max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <button type="button" onClick={onClose} aria-label={t.cancel}
          className="motion-press absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-2 pr-6 text-lg font-semibold leading-none tracking-tight">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {fillTemplate(request.kind === 'message' ? t.reportMessageDescription : t.reportGroupDescription, values)}
        </p>
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium">{t.reasonLabel}</legend>
          <div className="space-y-1">
            {CONTENT_REPORT_REASONS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
                <input type="radio" name="content-report-reason" value={key} checked={reason === key}
                  onChange={() => { setReason(key); setError(null); }} className="h-4 w-4 accent-primary" />
                <span>{t.contentReasons[key]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mb-1 block text-sm font-medium" htmlFor="content-report-note">{illegal ? t.illegalNoteLabel : t.noteLabel}</label>
        <textarea id="content-report-note" value={note} maxLength={MAX_CONTENT_REPORT_NOTE} rows={illegal ? 5 : 3}
          placeholder={illegal ? t.illegalNotePlaceholder : t.notePlaceholder} required={illegal} aria-invalid={!!error && missingNote}
          onChange={(event) => { setNote(event.target.value.slice(0, MAX_CONTENT_REPORT_NOTE)); setError(null); }}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <p className="mb-3 text-right text-xs text-muted-foreground">{fillTemplate(t.contentNoteCounter, { count: String(note.length) })}</p>
        {illegal && <p className="mb-4 text-xs text-muted-foreground">{t.illegalHint}</p>}
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="motion-press rounded-md bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/90">
            {t.cancel}
          </button>
          <button type="submit" disabled={!reason || busy || missingNote}
            className="motion-press rounded-md bg-destructive px-4 py-2 text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
            {t.submit}
          </button>
        </div>
      </form>
    </ModalSurface>
  );
};
