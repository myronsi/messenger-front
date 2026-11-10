import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage, type Translations } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { useReportStickerPackMutation } from '../api/ownPacksApi';

const REASONS = [
  ['spam', 'reportReasonSpam'],
  ['violence', 'reportReasonViolence'],
  ['sexual', 'reportReasonSexual'],
  ['hate', 'reportReasonHate'],
  ['copyright', 'reportReasonCopyright'],
  ['other', 'reportReasonOther'],
] as const satisfies readonly (readonly [string, keyof Translations])[];

type Reason = (typeof REASONS)[number][0];

export const StickerPackReport = ({ packId }: { packId: string }) => {
  const { translations } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [report, { isLoading, isSuccess, error }] = useReportStickerPackMutation();
  if (isSuccess) return <p role="status" className="text-center text-sm text-muted-foreground">{translations.reportStickerPackSent}</p>;
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="self-center text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="mr-2 h-4 w-4" />{translations.reportStickerPack}
      </Button>
    );
  }
  const failed = error && ('status' in error && error.status === 429 ? translations.reportStickerPackLimit : translations.reportStickerPackFailed);
  return (
    <fieldset className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">{translations.reportStickerPackTitle}</legend>
      {REASONS.map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <input type="radio" name="sticker-report" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-primary" />
          {translations[label]}
        </label>
      ))}
      {failed && <p role="alert" className="text-sm text-destructive">{failed}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{translations.cancel}</Button>
        <Button variant="destructive" size="sm" disabled={isLoading} onClick={() => { void report({ packId, reason }); }}>{translations.reportStickerPack}</Button>
      </div>
    </fieldset>
  );
};
