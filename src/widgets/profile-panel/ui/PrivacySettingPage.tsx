import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { PrivacyExceptionEffect } from '@/features/profile';
import type { useLanguage } from '@/shared/contexts/LanguageContext';
import { choiceOf, choicesFor, exceptionEffectsOf, type PrivacyChoice } from '../model/privacyChoices';

type Translations = ReturnType<typeof useLanguage>['translations'];

interface PrivacySettingPageProps {
  title: string;
  hint: (effect: PrivacyExceptionEffect) => string;
  mode: string;
  modes: readonly string[];
  exceptionCount: (effect: PrivacyExceptionEffect) => number;
  supportsExceptions: boolean;
  disabled: boolean;
  translations: Translations;
  choiceLabel: (choice: string) => string;
  onChoose: (choice: PrivacyChoice) => void;
  onOpenExceptions: (effect: PrivacyExceptionEffect) => void;
}

const PrivacySettingPage: React.FC<PrivacySettingPageProps> = ({
  title, hint, mode, modes, exceptionCount, supportsExceptions, disabled, translations, choiceLabel, onChoose, onOpenExceptions,
}) => {
  const selected = choiceOf(mode);
  const effects = supportsExceptions ? exceptionEffectsOf(selected) : [];
  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label={title} className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {choicesFor(modes).map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={choice === selected}
            disabled={disabled}
            onClick={() => { if (choice !== selected) onChoose(choice); }}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50 disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className={`block ${choice === selected ? 'font-medium text-primary' : 'text-foreground'}`}>{choiceLabel(choice)}</span>
              {choice === 'shared_chats' && <span className="block text-xs text-muted-foreground">{translations.sharedChatsHint}</span>}
            </span>
            {choice === selected && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
      {effects.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.privacyExceptions}</p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {effects.map((effect) => {
              return (
                <button
                  key={effect}
                  type="button"
                  onClick={() => onOpenExceptions(effect)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{effect === 'deny' ? translations.neverAllow : translations.alwaysAllow}</span>
                    <span className="block text-xs text-muted-foreground">{hint(effect)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{exceptionCount(effect)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default PrivacySettingPage;
