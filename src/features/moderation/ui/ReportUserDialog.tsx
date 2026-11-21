import { useState } from 'react';
import { Flag } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import type { EntityId } from '@/shared/api/entityId';
import { useReportUserMutation, type ReportReason } from '../api/moderationApi';
import { MAX_REPORT_NOTE, REPORT_REASONS } from '../model/accountStatus';
import { GuidelinesHint } from './GuidelinesHint';
import { ReasonChips } from './ReasonChips';

interface ReportUserDialogProps {
  userId: EntityId;
  name: string;
  onClose: () => void;
  onReported?: (blocked: boolean) => void;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined);

export const ReportUserDialog = ({ userId, name, onClose, onReported }: ReportUserDialogProps) => {
  const t = useLanguage().translations.moderation;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [block, setBlock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, { isLoading }] = useReportUserMutation();
  const values = { name };

  const submit = async () => {
    if (!reason || isLoading) return;
    setError(null);
    try {
      await report({ userId, reason, note: note.trim() || null, block }).unwrap();
      toast(block ? fillTemplate(t.sentAndBlocked, values) : t.sent);
      onReported?.(block);
      onClose();
    } catch (caught) {
      setError(statusOf(caught) === 429 ? t.tooMany : t.failed);
    }
  };

  return (
    <ActionDialog
      icon={<Flag />}
      title={fillTemplate(t.reportTitle, values)}
      points={[fillTemplate(t.reportDescription, values)]}
      option={{ label: fillTemplate(t.blockToo, values), checked: block, onChange: setBlock }}
      confirmText={t.submit}
      cancelText={t.cancel}
      busy={isLoading}
      confirmDisabled={!reason}
      error={error}
      onCancel={onClose}
      onConfirm={() => void submit()}
    >
      <GuidelinesHint className="-mt-2 mb-4" />
      <ReasonChips name="report-reason" legend={t.reasonLabel} reasons={REPORT_REASONS} labels={t.reasons} value={reason} onChange={setReason} />
      <label className="mb-1 block text-sm text-muted-foreground" htmlFor="report-note">{t.noteLabel}</label>
      <textarea id="report-note" value={note} maxLength={MAX_REPORT_NOTE} rows={3} placeholder={t.notePlaceholder}
        onChange={(event) => setNote(event.target.value.slice(0, MAX_REPORT_NOTE))}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <p className="mb-3 text-right text-xs text-muted-foreground">{fillTemplate(t.noteCounter, { count: String(note.length) })}</p>
    </ActionDialog>
  );
};
