import { useState } from 'react';
import { ArrowLeft, Check, CircleCheck, Copyright, EyeOff, Megaphone, MessageSquareWarning, MoreHorizontal, Swords, type LucideIcon } from 'lucide-react';
import { useLanguage, type Translations } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { BackToClose } from '@/shared/ui/BackToClose';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';

export type PackReportReason = 'spam' | 'violence' | 'sexual' | 'hate' | 'copyright' | 'other';

const REASONS: readonly (readonly [PackReportReason, LucideIcon, keyof Translations, keyof Translations])[] = [
  ['spam', Megaphone, 'reportReasonSpam', 'reportReasonSpamHint'],
  ['violence', Swords, 'reportReasonViolence', 'reportReasonViolenceHint'],
  ['sexual', EyeOff, 'reportReasonSexual', 'reportReasonSexualHint'],
  ['hate', MessageSquareWarning, 'reportReasonHate', 'reportReasonHateHint'],
  ['copyright', Copyright, 'reportReasonCopyright', 'reportReasonCopyrightHint'],
  ['other', MoreHorizontal, 'reportReasonOther', 'reportReasonOtherHint'],
];

const isRateLimited = (error: unknown) => !!error && typeof error === 'object' && 'status' in error && error.status === 429;

interface PackReportPageProps {
  onBack: () => void;
  onSubmit: (reason: PackReportReason) => Promise<unknown>;
  onDone: () => void;
  inDialog?: boolean;
}

export const PackReportPage = ({ onBack, onSubmit, onDone, inDialog = false }: PackReportPageProps) => {
  const { translations } = useLanguage();
  const [reason, setReason] = useState<PackReportReason>();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [failure, setFailure] = useState<string>();
  const text = (key: keyof Translations) => String(translations[key]);
  const slide = inDialog ? '' : 'profile-panel-slide-in-right ';

  const send = async () => {
    if (!reason) return;
    setState('sending');
    setFailure(undefined);
    try {
      await onSubmit(reason);
      setState('sent');
    } catch (error) {
      setState('idle');
      setFailure(isRateLimited(error) ? translations.reportStickerPackLimit : translations.reportStickerPackFailed);
    }
  };

  if (state === 'sent') {
    return (
      <div data-testid="pack-report-sent" role="status" className={`${slide}flex flex-col items-center gap-2 py-6 text-center`}>
        <CircleCheck className="h-10 w-10 text-primary" />
        <p className="text-base font-medium">{translations.reportStickerPackSent}</p>
        <p className="text-sm text-muted-foreground">{translations.reportPackReview}</p>
        <Button variant="outline" className="mt-2 min-w-32" onClick={onDone}>{translations.reportPackDone}</Button>
      </div>
    );
  }

  return (
    <div data-testid="pack-report-page" className={`${slide}flex min-h-0 flex-col gap-1`}>
      {inDialog ? (
        <>
          <DialogTitle className="text-base">{translations.reportStickerPack}</DialogTitle>
          <DialogDescription className="mb-1">{translations.reportStickerPackTitle}</DialogDescription>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={translations.back} onClick={onBack}
              className="motion-press -ml-1.5 flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="text-base font-semibold">{translations.reportStickerPack}</h3>
          </div>
          <p className="mb-1 text-sm text-muted-foreground">{translations.reportStickerPackTitle}</p>
        </>
      )}
      <div role="radiogroup" aria-label={translations.reportStickerPackTitle} className="flex min-h-0 flex-col overflow-y-auto">
        {REASONS.map(([value, Icon, label, hint]) => (
          <button key={value} type="button" role="radio" aria-checked={reason === value} onClick={() => setReason(value)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{text(label)}</span>
              <span className="block text-xs text-muted-foreground">{text(hint)}</span>
            </span>
            <Check className={`h-4 w-4 shrink-0 text-primary ${reason === value ? '' : 'invisible'}`} />
          </button>
        ))}
      </div>
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <div className={`grid transition-[grid-template-rows] duration-200 ${reason ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <Button variant="outline" disabled={!reason || state === 'sending'} onClick={() => void send()}
            className="mt-2 w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
            {translations.reportPackSend}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PackReportProps {
  mobile: boolean;
  onClose: () => void;
  onSubmit: (reason: PackReportReason) => Promise<unknown>;
  onSent: () => void;
}

export const PackReport = ({ mobile, onClose, onSubmit, onSent }: PackReportProps) => (mobile ? (
  <>
    <BackToClose flag="packReport" onClose={onClose} />
    <PackReportPage onBack={onClose} onSubmit={onSubmit} onDone={onSent} />
  </>
) : (
  <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent data-testid="pack-report-dialog" className="max-w-sm gap-3 p-5" onClick={(event) => event.stopPropagation()}>
      <PackReportPage inDialog onBack={onClose} onSubmit={onSubmit} onDone={onSent} />
    </DialogContent>
  </Dialog>
));
