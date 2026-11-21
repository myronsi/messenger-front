import { useState } from 'react';
import { Flag } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import type { ContentReportRequest } from '@/entities/message';
import { useReportGroupMutation, useReportMessageMutation, type ContentReportReason } from '../api/moderationApi';
import { CONTENT_REPORT_REASONS, MAX_CONTENT_REPORT_NOTE } from '../model/accountStatus';
import { GuidelinesHint } from './GuidelinesHint';
import { ReasonChips } from './ReasonChips';

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
    <ActionDialog
      icon={<Flag />}
      title={title}
      points={[fillTemplate(request.kind === 'message' ? t.reportMessageDescription : t.reportGroupDescription, values)]}
      confirmText={t.submit}
      cancelText={t.cancel}
      busy={busy}
      confirmDisabled={!reason || missingNote}
      error={error}
      onCancel={onClose}
      onConfirm={() => void submit()}
    >
      <GuidelinesHint className="-mt-2 mb-4" />
      <ReasonChips name="content-report-reason" legend={t.reasonLabel} reasons={CONTENT_REPORT_REASONS} labels={t.contentReasons}
        value={reason} onChange={(key) => { setReason(key); setError(null); }} />
      <label className="mb-1 block text-sm text-muted-foreground" htmlFor="content-report-note">{illegal ? t.illegalNoteLabel : t.noteLabel}</label>
      <textarea id="content-report-note" value={note} maxLength={MAX_CONTENT_REPORT_NOTE} rows={illegal ? 5 : 3}
        placeholder={illegal ? t.illegalNotePlaceholder : t.notePlaceholder} required={illegal} aria-invalid={!!error && missingNote}
        onChange={(event) => { setNote(event.target.value.slice(0, MAX_CONTENT_REPORT_NOTE)); setError(null); }}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <p className="mb-3 text-right text-xs text-muted-foreground">{fillTemplate(t.contentNoteCounter, { count: String(note.length) })}</p>
      {illegal && <p className="mb-4 text-xs text-muted-foreground">{t.illegalHint}</p>}
    </ActionDialog>
  );
};
