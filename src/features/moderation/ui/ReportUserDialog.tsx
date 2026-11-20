import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import type { EntityId } from '@/shared/api/entityId';
import { useReportUserMutation, type ReportReason } from '../api/moderationApi';
import { MAX_REPORT_NOTE, REPORT_REASONS } from '../model/accountStatus';
import { GuidelinesHint } from './GuidelinesHint';

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

  return createPortal(
    <ModalSurface label={fillTemplate(t.reportTitle, values)}
      className="fixed inset-0 z-[11002] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <form className="motion-panel-in relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <button type="button" onClick={onClose} aria-label={t.cancel}
          className="motion-press absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-2 text-lg font-semibold leading-none tracking-tight">{fillTemplate(t.reportTitle, values)}</h3>
        <p className="mb-2 text-sm text-muted-foreground">{fillTemplate(t.reportDescription, values)}</p>
        <GuidelinesHint className="mb-4" />
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium">{t.reasonLabel}</legend>
          <div className="space-y-1">
            {REPORT_REASONS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
                <input type="radio" name="report-reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="h-4 w-4 accent-primary" />
                <span>{t.reasons[key]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mb-1 block text-sm font-medium" htmlFor="report-note">{t.noteLabel}</label>
        <textarea id="report-note" value={note} maxLength={MAX_REPORT_NOTE} rows={3} placeholder={t.notePlaceholder}
          onChange={(event) => setNote(event.target.value.slice(0, MAX_REPORT_NOTE))}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <p className="mb-3 text-right text-xs text-muted-foreground">{fillTemplate(t.noteCounter, { count: String(note.length) })}</p>
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} className="h-4 w-4 accent-destructive" />
          <span>{fillTemplate(t.blockToo, values)}</span>
        </label>
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="motion-press rounded-md bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/90">
            {t.cancel}
          </button>
          <button type="submit" disabled={!reason || isLoading}
            className="motion-press rounded-md bg-destructive px-4 py-2 text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
            {t.submit}
          </button>
        </div>
      </form>
    </ModalSurface>,
    document.body,
  );
};
