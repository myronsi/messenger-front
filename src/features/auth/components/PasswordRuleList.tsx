import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { PASSWORD_RULES, passwordChecks } from '../model/registerForm';

export const PasswordRuleList: React.FC<{ id: string; password: string }> = ({ id, password }) => {
  const t = useLanguage().translations.authLayout;
  const checks = passwordChecks(password);
  return (
    <ul id={id} aria-label={t.rulesLabel} className="flex flex-wrap gap-1.5">
      {PASSWORD_RULES.map((rule) => (
        <li key={rule} data-met={checks[rule]} title={t.rules[rule]}
          className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium tabular-nums transition-colors',
            checks[rule] ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>
          {checks[rule] && <Check className="h-3 w-3" aria-hidden="true" />}
          <span aria-hidden="true">{t.rulesShort[rule]}</span>
          <span className="sr-only">{t.rules[rule]}</span>
        </li>
      ))}
    </ul>
  );
};
