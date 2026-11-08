import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { OPTIONAL_REGISTER_STEPS, REGISTER_STEPS, type RegisterStep } from '../model/registerForm';

export const RegisterStepList: React.FC<{ current: RegisterStep }> = ({ current }) => {
  const t = useLanguage().translations.authLayout;
  const currentIndex = REGISTER_STEPS.indexOf(current);
  return (
    <ol className="flex flex-col gap-3.5" aria-label={fillTemplate(t.stepOf, { current: String(currentIndex + 1), total: String(REGISTER_STEPS.length) })}>
      {REGISTER_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} aria-current={active ? 'step' : undefined}
            className={cn('flex items-center gap-3 text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
              active || done ? 'bg-primary text-primary-foreground' : 'border border-input')}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <span>
              {t.steps[step]}
              {OPTIONAL_REGISTER_STEPS.includes(step) && <span className="font-normal text-muted-foreground"> · {t.optional}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export const RegisterProgress: React.FC<{ current: RegisterStep; className?: string }> = ({ current, className }) => {
  const t = useLanguage().translations.authLayout;
  const currentIndex = REGISTER_STEPS.indexOf(current);
  const label = fillTemplate(t.stepOf, { current: String(currentIndex + 1), total: String(REGISTER_STEPS.length) });
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-xs text-muted-foreground">{label} · {t.steps[current]}</p>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {REGISTER_STEPS.map((step, index) => (
          <span key={step} className={cn('h-1 rounded-full', index <= currentIndex ? 'bg-primary' : 'bg-accent-darker')} />
        ))}
      </div>
    </div>
  );
};
