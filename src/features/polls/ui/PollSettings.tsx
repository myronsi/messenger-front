import { useId, type ReactNode } from 'react';
import { CheckCircle2, Clock, EyeOff, ListChecks } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import {
  CLOSE_PRESETS, EXPLANATION_MAX, localInputValue, presetCloseAt, type ClosePreset, type PollDraft,
} from '../model/pollDraft';

interface RowProps {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  tone?: 'success';
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}

const SettingRow = ({ icon, label, hint, checked, disabled, tone, onChange, children }: RowProps) => {
  const id = useId();
  const hintId = useId();
  return (
    <div className="border-b border-border px-3.5 py-2.5 last:border-b-0">
      <div className="flex min-h-11 items-center gap-3">
        <span aria-hidden="true" className={cn('flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]',
          tone === 'success' && checked ? 'bg-success-soft text-success' : disabled ? 'bg-muted text-muted-foreground/60' : 'bg-accent text-primary')}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className={cn('block text-[15px] font-medium', disabled && 'text-muted-foreground')}>{label}</label>
          <span id={hintId} className="block text-[13px] leading-snug text-muted-foreground">{hint}</span>
        </div>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-describedby={hintId} />
      </div>
      {checked && children && <div className="mt-3 md:ml-[46px]">{children}</div>}
    </div>
  );
};

interface PollSettingsProps {
  draft: PollDraft;
  update: (changes: Partial<PollDraft>) => void;
}

export const PollSettings = ({ draft, update }: PollSettingsProps) => {
  const { translations, language } = useLanguage();
  const t = translations.polls;
  const explanationId = useId();
  const presetLabels: Record<ClosePreset, string> = {
    hour: t.presetHour, day: t.presetDay, threeDays: t.presetThreeDays, week: t.presetWeek, custom: t.presetCustom,
  };
  const presets: ClosePreset[] = [...CLOSE_PRESETS.map((preset) => preset.id), 'custom'];
  const closeAt = Date.parse(draft.closeAt);
  const closeLabel = draft.closeAtOn && Number.isFinite(closeAt)
    ? fillTemplate(t.closesOn, {
      time: new Intl.DateTimeFormat(localeOf(language), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(closeAt),
    })
    : t.closeAtHint;
  const icon = 'h-[18px] w-[18px]';

  return (
    <div className="space-y-2">
      <span className="block px-1 text-[13px] font-semibold text-muted-foreground">{t.settings}</span>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <SettingRow icon={<EyeOff className={icon} />} label={t.anonymous} hint={t.anonymousHint} checked={draft.anonymous}
          onChange={(anonymous) => update({ anonymous })} />
        <SettingRow icon={<ListChecks className={icon} />} label={t.multipleAnswers} hint={draft.quiz ? t.quizSingleAnswer : t.multipleHint}
          checked={draft.multiple && !draft.quiz} disabled={draft.quiz} onChange={(multiple) => update({ multiple })} />
        <SettingRow icon={<CheckCircle2 className={icon} />} label={t.quizMode} hint={t.quizHint} checked={draft.quiz} tone="success"
          onChange={(quiz) => update({ quiz, multiple: quiz ? false : draft.multiple })}>
          <label htmlFor={explanationId} className="mb-1.5 block text-[13px] text-muted-foreground">{t.explanation}</label>
          <div className="rounded-xl border border-input bg-background px-3 pb-2 pt-2.5 focus-within:border-primary">
            <textarea id={explanationId} rows={2} value={draft.explanation} maxLength={EXPLANATION_MAX} placeholder={t.explanationPlaceholder}
              onChange={(event) => update({ explanation: event.target.value })}
              className="block w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-muted-foreground" />
            <span className="block text-right text-xs text-muted-foreground">{draft.explanation.length} / {EXPLANATION_MAX}</span>
          </div>
        </SettingRow>
        <SettingRow icon={<Clock className={icon} />} label={t.closeAt} hint={closeLabel} checked={draft.closeAtOn}
          onChange={(closeAtOn) => update({ closeAtOn, closeAt: presetCloseAt(draft.closePreset, draft.closeAt) })}>
          <div role="radiogroup" aria-label={t.closeAfter} className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const selected = draft.closePreset === preset;
              return (
                <button key={preset} type="button" role="radio" aria-checked={selected}
                  onClick={() => update({ closePreset: preset, closeAt: presetCloseAt(preset, draft.closeAt) })}
                  className={cn('motion-press h-9 rounded-full border px-3.5 text-sm transition-colors',
                    selected ? 'border-primary bg-accent font-semibold text-primary' : 'border-input hover:bg-accent')}>
                  {presetLabels[preset]}
                </button>
              );
            })}
          </div>
          {draft.closePreset === 'custom' && (
            <label className="mt-3 block space-y-1">
              <span className="text-[13px] text-muted-foreground">{t.closeAtLabel}</span>
              <Input type="datetime-local" value={draft.closeAt} min={localInputValue(new Date(Date.now() + 5 * 60_000))}
                onChange={(event) => update({ closeAt: event.target.value })} />
            </label>
          )}
        </SettingRow>
      </div>
    </div>
  );
};
