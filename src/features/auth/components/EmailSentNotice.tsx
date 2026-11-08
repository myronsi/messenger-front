import { Clock, Mail, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatCountdown } from '@/shared/lib/countdown';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';

export const EmailSentNotice = ({ identifier, resendIn, busy, message, onResend, onTryAnotherWay }: {
  identifier: string; resendIn: number; busy: boolean; message: string; onResend: () => void; onTryAnotherWay: () => void;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const [before, after = ''] = t.emailSentBody.split('{identifier}');
  const waiting = resendIn > 0;
  return <div className="flex flex-col items-center gap-5 text-center">
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/10 text-primary">
      <Mail className="h-[34px] w-[34px]" strokeWidth={1.8} aria-hidden="true" />
    </div>
    <div className="flex flex-col gap-2">
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.emailSentTitle}</h1>
      <p role="status" className="text-sm leading-normal text-subtle-foreground">
        {before}<strong className="font-semibold text-foreground">{identifier}</strong>{after}
      </p>
    </div>
    <ul className="flex w-full flex-col gap-2 rounded-[10px] border border-border bg-muted/50 px-4 py-3.5 text-left text-[13px] text-subtle-foreground">
      <li className="flex gap-2"><Clock className="mt-px h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />{t.emailTipSpam}</li>
      <li className="flex gap-2"><ShieldAlert className="mt-px h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />{t.emailTipTwoFactor}</li>
    </ul>
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <Button variant="outline" className="h-11 w-full disabled:opacity-100 disabled:bg-muted/50 disabled:text-muted-foreground" disabled={waiting || busy} onClick={onResend}>
      {waiting ? fillTemplate(t.resendIn, { time: formatCountdown(resendIn) }) : busy ? t.pleaseWait : t.resend}
    </Button>
    <Button variant="link" className="h-11" onClick={onTryAnotherWay}>{t.tryAnotherWay}</Button>
  </div>;
};
