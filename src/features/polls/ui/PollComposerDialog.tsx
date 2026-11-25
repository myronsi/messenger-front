import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { PollCreate } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { buildPoll, draftProblem, emptyDraft, QUESTION_MAX, type DraftOption, type PollDraft } from '../model/pollDraft';
import { PollOptionsEditor } from './PollOptionsEditor';
import { PollPreview } from './PollPreview';
import { PollSettings } from './PollSettings';

interface PollComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (poll: PollCreate) => void;
}

const plainEnter = (event: KeyboardEvent) => event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing;

export const PollComposerDialog = ({ open, onClose, onSend }: PollComposerDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const questionId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<PollDraft>(() => emptyDraft());
  const [attempted, setAttempted] = useState(false);
  const nextId = useRef(3);
  const problem = draftProblem(draft, t);
  const update = (changes: Partial<PollDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const setOptions = (options: DraftOption[], removed?: number) => setDraft((current) => ({
    ...current, options, correct: removed !== undefined && current.correct === removed ? null : current.correct,
  }));
  const close = () => {
    onClose();
    window.setTimeout(() => { setDraft(emptyDraft()); setAttempted(false); nextId.current = 3; }, 200);
  };
  const submit = () => {
    if (problem) { setAttempted(true); return; }
    onSend(buildPoll(draft));
    close();
  };
  const firstOption = () => formRef.current?.querySelector<HTMLInputElement>('[data-testid="poll-option-row"] input')?.focus();
  const hint = problem
    ? <p role={attempted ? 'alert' : undefined} className={cn('text-[13px]', attempted ? 'text-destructive' : 'text-muted-foreground')}>{problem}</p>
    : <p className="hidden text-[13px] text-muted-foreground md:block">{t.keyboardHint}</p>;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent hideClose aria-describedby={undefined}
        className="flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-0 overflow-hidden p-0 md:h-[min(680px,calc(100dvh-2rem))] md:max-w-[900px] md:rounded-2xl">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-1.5 md:pl-6 md:pr-3">
          <button type="button" onClick={close} aria-label={t.cancel}
            className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-accent md:order-last md:text-muted-foreground">
            <X className="h-[22px] w-[22px] md:h-5 md:w-5" />
          </button>
          <DialogTitle className="flex-1 text-center text-[17px] font-semibold md:text-left md:text-lg">{draft.quiz ? t.newQuiz : t.newPoll}</DialogTitle>
          <span aria-hidden="true" className="w-11 shrink-0 md:hidden" />
        </div>
        <form ref={formRef} data-testid="poll-composer" className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => { event.preventDefault(); submit(); }}
          onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit(); } }}>
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6">
              <div className="space-y-2">
                <label htmlFor={questionId} className="block px-1 text-[13px] font-semibold text-muted-foreground">{t.question}</label>
                <div className="rounded-2xl border border-border bg-card px-4 pb-2.5 pt-3.5 focus-within:border-primary">
                  <textarea id={questionId} autoFocus rows={2} value={draft.question} maxLength={QUESTION_MAX} placeholder={t.questionPlaceholder}
                    enterKeyHint="next" onChange={(event) => update({ question: event.target.value })}
                    onKeyDown={(event) => { if (plainEnter(event)) { event.preventDefault(); firstOption(); } }}
                    className="block w-full resize-none bg-transparent text-lg leading-snug outline-none placeholder:text-muted-foreground" />
                  <span className="block text-right text-xs text-muted-foreground">{draft.question.length} / {QUESTION_MAX}</span>
                </div>
              </div>
              <PollOptionsEditor options={draft.options} quiz={draft.quiz} correct={draft.correct} nextId={() => nextId.current++}
                onOptions={setOptions} onCorrect={(correct) => update({ correct })} />
              <PollSettings draft={draft} update={update} />
              <PollPreview draft={draft} className="md:hidden" />
            </div>
            <aside className="hidden w-[340px] shrink-0 flex-col justify-end border-l border-border bg-card/40 p-5 md:flex">
              <PollPreview draft={draft} />
            </aside>
          </div>
          <div className="shrink-0 space-y-2.5 border-t border-border px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 text-center md:flex md:items-center md:gap-2.5 md:space-y-0 md:px-6 md:py-4 md:text-left">
            <div className="md:flex-1">{hint}</div>
            <Button type="button" variant="secondary" onClick={close} className="hidden md:inline-flex">{t.cancel}</Button>
            <Button type="submit" aria-disabled={problem ? true : undefined}
              className={cn('h-[52px] w-full rounded-[14px] text-base font-semibold md:h-10 md:w-auto md:rounded-lg md:text-sm',
                problem && 'bg-accent text-muted-foreground hover:bg-accent')}>
              {draft.quiz ? t.createQuiz : t.createPoll}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
