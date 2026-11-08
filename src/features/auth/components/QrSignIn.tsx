import { useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { countdownProgress, formatCountdown } from '@/shared/lib/countdown';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { finishQrSignIn } from '../api/qrLoginApi';
import type { QrLoginApproved } from '../model/qrLoginTypes';
import { useQrLoginPoll, type QrSignInStatus } from '../model/useQrLoginPoll';

const dotClass: Partial<Record<QrSignInStatus, string>> = {
  pending: 'bg-warning motion-safe:animate-pulse',
  scanned: 'bg-primary motion-safe:animate-pulse',
  approved: 'bg-success',
  denied: 'bg-destructive',
  expired: 'bg-muted-foreground',
  failed: 'bg-destructive',
  rateLimited: 'bg-destructive',
};

export const QrSignIn = ({ onSignedIn, onBack }: { onSignedIn: (username: string) => void; onBack: () => void }) => {
  const t = useLanguage().translations.qrLogin;
  const [finishFailed, setFinishFailed] = useState(false);
  const finish = useCallback((result: QrLoginApproved) => {
    setFinishFailed(false);
    void finishQrSignIn(result).then(onSignedIn).catch(() => setFinishFailed(true));
  }, [onSignedIn]);
  const { request, status, seconds, totalSeconds, connectionError, refresh } = useQrLoginPoll(finish);
  const ended = status === 'denied' || status === 'expired' || status === 'failed' || status === 'rateLimited' || finishFailed;
  const live = status === 'pending' || status === 'scanned';
  const time = formatCountdown(seconds);
  const statusText = finishFailed ? t.finishFailed : {
    creating: t.creating, pending: t.waiting, scanned: t.scanned, approved: t.signingIn, denied: t.denied, expired: t.expired,
    failed: t.createFailed, rateLimited: t.tooManyCodes,
  }[status];

  return <div className="flex flex-col items-center gap-5 text-center">
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.title}</h1>
      <p className="text-sm text-subtle-foreground">{t.instructions}</p>
    </div>
    <div className={`rounded-xl border border-border qr-surface p-3 ${live ? '' : 'opacity-40'}`}>
      {request ? <QRCodeSVG value={request.url} size={208} level="M" marginSize={2} title={t.qrTitle} />
        : <div className="h-[208px] w-[208px] animate-pulse rounded-md bg-muted" aria-hidden="true" />}
    </div>
    {live && <ProgressRing progress={countdownProgress(seconds, totalSeconds)} size={64} stroke={5} className="stroke-primary"
      label={fillTemplate(t.ringLabel, { time })}>
      <span className="text-[13px] font-semibold tabular-nums text-foreground">{time}</span>
    </ProgressRing>}
    <p role="status" className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-[13px] text-subtle-foreground">
      <span className={`h-2 w-2 rounded-full ${dotClass[finishFailed ? 'failed' : status] ?? 'bg-muted-foreground'}`} aria-hidden="true" />{statusText}
    </p>
    {connectionError && live && <p role="alert" className="text-sm text-destructive">{t.connectRetry}</p>}
    <div className="flex w-full flex-col gap-2">
      {ended && <Button className="h-11 w-full font-semibold" onClick={() => { setFinishFailed(false); refresh(); }}>{t.newCode}</Button>}
      <Button variant="link" className="h-11" onClick={onBack}>{t.backToSignIn}</Button>
    </div>
  </div>;
};
