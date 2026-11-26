import type { ReactNode } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import type { AccountStatusLevel } from '../api/moderationApi';

const STANDING_LEVELS: AccountStatusLevel[] = ['good', 'warned', 'limited', 'restricted', 'suspended'];

const standingFill: Record<AccountStatusLevel, string> = {
  good: 'bg-success', warned: 'bg-warning', limited: 'bg-warning', restricted: 'bg-destructive', suspended: 'bg-destructive',
};

const standingText: Record<AccountStatusLevel, string> = {
  good: 'text-success', warned: 'text-warning', limited: 'text-warning', restricted: 'text-destructive', suspended: 'text-destructive',
};

export const StandingScale = ({ level, avatar }: { level: AccountStatusLevel; avatar: ReactNode }) => {
  const t = useLanguage().translations.moderation;
  const at = STANDING_LEVELS.indexOf(level);
  return (
    <ol aria-label={t.standingScale} data-testid="standing-scale" className="relative grid grid-cols-5">
      <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-5 h-1 rounded-full bg-muted" />
      <span aria-hidden="true" className={cn('absolute left-[10%] top-5 h-1 rounded-full', standingFill[level])} style={{ width: `${at * 20}%` }} />
      {STANDING_LEVELS.map((key, index) => {
        const current = index === at;
        return (
          <li key={key} aria-current={current ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">
            <span className="flex h-11 items-center justify-center">
              {current ? (
                <span className={cn('h-11 w-11 rounded-full p-0.5 ring-4 ring-background', standingFill[key])}>
                  <span className="block h-full w-full overflow-hidden rounded-full bg-background">{avatar}</span>
                </span>
              ) : (
                <span className={cn('h-3.5 w-3.5 rounded-full ring-4 ring-background', index < at ? standingFill[level] : 'bg-muted-foreground/40')} />
              )}
            </span>
            <span className={cn('px-0.5 text-[11px] leading-tight', current ? cn('font-semibold', standingText[key]) : 'text-muted-foreground')}>
              {t.statuses[key]}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
