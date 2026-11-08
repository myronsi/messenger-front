import { useLanguage } from '@/shared/contexts/LanguageContext';
import { countdownProgress, formatCountdown } from '@/shared/lib/countdown';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/ProgressRing';

export const DeviceRecoveryWaiting = ({ username, matchNumber, seconds, totalSeconds, onCancel, onTryAnotherWay }: {
  username: string; matchNumber: number; seconds: number; totalSeconds: number; onCancel: () => void; onTryAnotherWay: () => void;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const [before, after = ''] = t.waitingIntro.split('{username}');
  const number = String(matchNumber);
  const steps = [t.stepPopup, fillTemplate(t.stepTap, { number }), t.stepReturn];
  const ringLabel = fillTemplate(t.ringLabel, { number, minutes: String(Math.floor(seconds / 60)), seconds: String(seconds % 60) });
  return <div className="flex flex-col items-center gap-5 text-center">
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.waitingTitle}</h1>
      <p className="text-sm text-subtle-foreground">{before}<strong className="font-semibold text-foreground">{username}</strong>{after}</p>
    </div>
    <ProgressRing progress={countdownProgress(seconds, totalSeconds)} size={176} stroke={8} label={ringLabel} className="stroke-primary">
      <span className="text-7xl font-extrabold leading-none tracking-tight text-foreground">{matchNumber}</span>
      <span className="mt-1.5 text-[13px] tabular-nums text-subtle-foreground">{fillTemplate(t.timeLeft, { time: formatCountdown(seconds) })}</span>
    </ProgressRing>
    <p role="status" className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-[13px] text-subtle-foreground">
      <span className="h-2 w-2 rounded-full bg-warning motion-safe:animate-pulse" aria-hidden="true" />{t.waitingPill}
    </p>
    <ol className="flex w-full flex-col gap-2.5 text-left">
      {steps.map((step, index) => <li key={index} className="flex gap-2.5 text-[13px] text-subtle-foreground">
        <span aria-hidden="true" className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>{step}
      </li>)}
    </ol>
    <div className="flex w-full flex-wrap gap-2.5">
      <Button variant="outline" className="h-11 flex-1 border-input" onClick={onCancel}>{t.cancelRequest}</Button>
      <Button variant="link" className="h-11 flex-1" onClick={onTryAnotherWay}>{t.tryAnotherWay}</Button>
    </div>
  </div>;
};
