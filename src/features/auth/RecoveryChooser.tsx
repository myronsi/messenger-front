import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export type RecoveryMethod = 'device' | 'key' | 'email';

const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const icons: Record<RecoveryMethod, ReactNode> = {
  device: <svg {...iconProps}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 12l2 2 4-4" /></svg>,
  key: <svg {...iconProps}><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3L21 2M16 7l3 3M18 5l2 2" /></svg>,
  email: <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
};

export const RecoveryChooser = ({ identifier, onIdentifierChange, onBack, onChoose, emailAvailable = true }: {
  identifier: string; onIdentifierChange: (value: string) => void; onBack: () => void;
  onChoose: (method: RecoveryMethod) => void; emailAvailable?: boolean;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const options: { method: RecoveryMethod; title: string; hint: string; highlighted?: boolean }[] = [
    { method: 'device', title: t.deviceOption, hint: t.deviceOptionHint, highlighted: true },
    { method: 'key', title: t.keyOption, hint: t.keyOptionHint },
    ...(emailAvailable ? [{ method: 'email' as const, title: t.emailOption, hint: t.emailOptionHint }] : []),
  ];
  return <Card className="mx-auto flex w-full max-w-md flex-col gap-[18px] rounded-2xl p-6 shadow-sm sm:p-7">
    <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-1.5 self-start text-[13px] text-slate-600 hover:underline">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t.backToSignIn}
    </button>
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.chooserTitle}</h1>
      <p className="text-sm text-slate-600">{t.chooserSubtitle}</p>
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="recovery-identifier" className="text-[13px] font-medium text-slate-700">{t.identifier}</Label>
      <Input id="recovery-identifier" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={254}
        className="h-11 border-slate-300 text-[15px]" value={identifier} onChange={event => onIdentifierChange(event.target.value)} />
    </div>
    <ul className="flex flex-col gap-2.5">
      {options.map(option => <li key={option.method}>
        <button type="button" onClick={() => onChoose(option.method)} className={cn(
          'flex w-full items-start gap-3.5 rounded-xl p-3.5 text-left text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          option.highlighted ? 'border-2 border-primary bg-blue-50 hover:bg-blue-100' : 'border border-border hover:bg-slate-50',
        )}>
          <span className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-lg',
            option.highlighted ? 'bg-white text-primary' : 'bg-slate-100 text-slate-700')}>{icons[option.method]}</span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold">{option.title}</span>
              {option.highlighted && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">{t.fastest}</span>}
            </span>
            <span className="text-[13px] text-slate-600">{option.hint}</span>
          </span>
        </button>
      </li>)}
    </ul>
    <p className="text-xs text-slate-500">{t.twoFactorNote}</p>
  </Card>;
};
