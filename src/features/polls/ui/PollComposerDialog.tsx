import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react';
import type { PollCreate } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import {
  buildPoll, draftProblem, emptyDraft, EXPLANATION_MAX, freshCloseAt, localInputValue, MAX_OPTIONS, moveOption, OPTION_MAX, QUESTION_MAX, type PollDraft,
} from '../model/pollDraft';

interface PollComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (poll: PollCreate) => void;
}

const Setting = ({ label, hint, checked, disabled, onChange, children }: {
  label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; children?: ReactNode;
}) => {
  const id = useId();
  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="min-w-0 flex-1 text-sm">
          <span className="block font-medium">{label}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </label>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {checked && children}
    </div>
  );
};

const iconButton = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30';

export const PollComposerDialog = ({ open, onClose, onSend }: PollComposerDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const [draft, setDraft] = useState<PollDraft>(() => emptyDraft());
  const [problem, setProblem] = useState<string | null>(null);
  const nextId = useRef(3);
  const update = (changes: Partial<PollDraft>) => { setDraft((current) => ({ ...current, ...changes })); setProblem(null); };
  const setOption = (id: number, text: string) => update({ options: draft.options.map((option) => (option.id === id ? { ...option, text } : option)) });
  const close = () => {
    onClose();
    window.setTimeout(() => { setDraft(emptyDraft()); setProblem(null); }, 200);
  };
  const submit = () => {
    const found = draftProblem(draft, t);
    if (found) { setProblem(found); return; }
    onSend(buildPoll(draft));
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>{draft.quiz ? t.newQuiz : t.newPoll}</DialogTitle></DialogHeader>
        <form data-testid="poll-composer" className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t.question}</span>
            <Input autoFocus value={draft.question} maxLength={QUESTION_MAX} placeholder={t.questionPlaceholder}
              onChange={(event) => update({ question: event.target.value })} />
          </label>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t.options}</legend>
            {draft.options.map((option, index) => {
              const number = String(index + 1);
              const correct = draft.quiz && draft.correct === option.id;
              return (
                <div key={option.id} className="flex items-center gap-1">
                  {draft.quiz && (
                    <button type="button" role="radio" aria-checked={correct} aria-label={fillTemplate(t.correctOption, { number })}
                      onClick={() => update({ correct: option.id })}
                      className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                        correct ? 'border-success bg-success text-success-foreground' : 'border-muted-foreground/50')}>
                      {correct && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                  )}
                  <Input value={option.text} maxLength={OPTION_MAX} placeholder={fillTemplate(t.optionPlaceholder, { number })}
                    aria-label={fillTemplate(t.optionPlaceholder, { number })} onChange={(event) => setOption(option.id, event.target.value)} />
                  <button type="button" className={iconButton} disabled={index === 0} aria-label={fillTemplate(t.moveUp, { number })}
                    onClick={() => update({ options: moveOption(draft.options, index, -1) })}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className={iconButton} disabled={index === draft.options.length - 1} aria-label={fillTemplate(t.moveDown, { number })}
                    onClick={() => update({ options: moveOption(draft.options, index, 1) })}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" className={iconButton} disabled={draft.options.length <= 2} aria-label={fillTemplate(t.removeOption, { number })}
                    onClick={() => update({
                      options: draft.options.filter((item) => item.id !== option.id), correct: draft.correct === option.id ? null : draft.correct,
                    })}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {draft.options.length < MAX_OPTIONS && (
              <button type="button" onClick={() => update({ options: [...draft.options, { id: nextId.current++, text: '' }] })}
                className="motion-press flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent">
                <Plus className="h-4 w-4" />{t.addOption}
              </button>
            )}
          </fieldset>
          <div className="divide-y divide-border rounded-xl border border-border px-3">
            <Setting label={t.anonymous} hint={t.anonymousHint} checked={draft.anonymous} onChange={(anonymous) => update({ anonymous })} />
            <Setting label={t.multipleAnswers} checked={draft.multiple && !draft.quiz} disabled={draft.quiz} onChange={(multiple) => update({ multiple })} />
            <Setting label={t.quizMode} hint={t.quizHint} checked={draft.quiz} onChange={(quiz) => update({ quiz, multiple: quiz ? false : draft.multiple })}>
              <label className="mt-2 block space-y-1">
                <span className="text-xs text-muted-foreground">{t.explanation}</span>
                <Input value={draft.explanation} maxLength={EXPLANATION_MAX} placeholder={t.explanationPlaceholder}
                  onChange={(event) => update({ explanation: event.target.value })} />
              </label>
            </Setting>
            <Setting label={t.closeAt} checked={draft.closeAtOn} onChange={(closeAtOn) => update({ closeAtOn, closeAt: freshCloseAt(draft.closeAt) })}>
              <label className="mt-2 block space-y-1">
                <span className="text-xs text-muted-foreground">{t.closeAtLabel}</span>
                <Input type="datetime-local" value={draft.closeAt} min={localInputValue(new Date(Date.now() + 5 * 60_000))}
                  onChange={(event) => update({ closeAt: event.target.value })} />
              </label>
            </Setting>
          </div>
          {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>{t.cancel}</Button>
            <Button type="submit">{t.create}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
