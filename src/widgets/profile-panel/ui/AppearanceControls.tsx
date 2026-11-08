import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { ACCENTS, toCss, type AccentId, type ThemeTone } from '@/shared/lib/appearance/palette';
import { CHAT_BACKGROUNDS, type ChatBackground } from '@/shared/lib/appearance/settings';

export const AppearanceSection: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  icons?: Partial<Record<T, LucideIcon>>;
  onChange: (value: T) => void;
}

export const ChoiceGroup = <T extends string>({ label, value, options, labels, icons, onChange }: ChoiceGroupProps<T>) => (
  <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
    {options.map((option) => {
      const Icon: LucideIcon | undefined = icons?.[option];
      const active = option === value;
      return (
        <button key={option} type="button" role="radio" aria-checked={active} onClick={() => onChange(option)}
          className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
          <span className="truncate">{labels[option]}</span>
        </button>
      );
    })}
  </div>
);

interface AccentSwatchesProps {
  label: string;
  value: AccentId;
  tone: ThemeTone;
  names: Record<AccentId, string>;
  onChange: (value: AccentId) => void;
}

export const AccentSwatches: React.FC<AccentSwatchesProps> = ({ label, value, tone, names, onChange }) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
    {(Object.keys(ACCENTS) as AccentId[]).map((id) => {
      const palette = ACCENTS[id][tone];
      const active = id === value;
      return (
        <button key={id} type="button" role="radio" aria-checked={active} aria-label={names[id]} title={names[id]} onClick={() => onChange(id)}
          style={{ backgroundColor: `hsl(${toCss(palette.primary)})`, color: `hsl(${toCss(palette.primaryForeground)})` }}
          className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active ? 'ring-2 ring-foreground/70' : ''}`}>
          {active && <Check className="h-4 w-4" aria-hidden="true" />}
        </button>
      );
    })}
  </div>
);

interface BackgroundSwatchesProps {
  label: string;
  value: ChatBackground;
  names: Record<ChatBackground, string>;
  onChange: (value: ChatBackground) => void;
}

export const BackgroundSwatches: React.FC<BackgroundSwatchesProps> = ({ label, value, names, onChange }) => (
  <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
    {CHAT_BACKGROUNDS.map((id) => {
      const active = id === value;
      return (
        <button key={id} type="button" role="radio" aria-checked={active} onClick={() => onChange(id)}
          className="group flex flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden="true" className={`chat-bg-${id} block h-14 w-full rounded-lg border-2 transition-colors ${
            active ? 'border-primary' : 'border-border group-hover:border-input'}`} />
          <span className={`text-xs ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{names[id]}</span>
        </button>
      );
    })}
  </div>
);
