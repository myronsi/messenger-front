import { useId, useRef, type KeyboardEvent } from 'react';
import { Check, GripVertical, Plus, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { useRowDrag } from '@/shared/lib/useRowDrag';
import { cn } from '@/shared/lib/utils';
import { isTrailingOption, MAX_OPTIONS, moveOptionTo, OPTION_MAX, withTrailingOption, type DraftOption } from '../model/pollDraft';

const ROW_HEIGHT = 52;

interface PollOptionsEditorProps {
  options: DraftOption[];
  quiz: boolean;
  correct: number | null;
  nextId: () => number;
  onOptions: (options: DraftOption[], removed?: number) => void;
  onCorrect: (id: number) => void;
}

export const PollOptionsEditor = ({ options, quiz, correct, nextId, onOptions, onCorrect }: PollOptionsEditorProps) => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const headingId = useId();
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const trailing = isTrailingOption(options, options.length - 1);
  const movable = trailing ? options.length - 1 : options.length;
  const reorder = (from: number, to: number) => onOptions(moveOptionTo(options, from, to));
  const drag = useRowDrag(movable, ROW_HEIGHT, reorder);
  const filled = options.filter((option) => option.text.trim()).length;

  const change = (list: DraftOption[], removed?: number) => onOptions(withTrailingOption(list, nextId), removed);
  const nextField = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const next = options[index + 1];
    if (next) inputs.current.get(next.id)?.focus();
  };
  const stepKeys = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!step || index + step < 0 || index + step >= movable) return;
    event.preventDefault();
    reorder(index, index + step);
  };

  return (
    <div role="group" aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <span id={headingId} className="text-[13px] font-semibold text-muted-foreground">{quiz ? t.answers : t.options}</span>
        <span className="text-xs text-muted-foreground">{fillTemplate(t.optionsCount, { count: String(filled), max: String(MAX_OPTIONS) })}</span>
      </div>
      <div role={quiz ? 'radiogroup' : undefined} aria-label={quiz ? t.quizPickHint : undefined}
        className="overflow-hidden rounded-2xl border border-border bg-card">
        {options.map((option, index) => {
          const number = String(index + 1);
          const last = isTrailingOption(options, index);
          const isCorrect = quiz && correct === option.id;
          const moved = drag.offsetOf(index);
          const dragging = drag.draggingIndex === index;
          return (
            <div key={option.id} data-testid="poll-option-row"
              className={cn('relative flex items-center gap-1 border-b border-border bg-card px-1 last:border-b-0',
                isCorrect && 'bg-success-soft', dragging && 'z-10 bg-accent shadow-lg')}
              style={{ height: ROW_HEIGHT, transform: moved ? `translateY(${moved}px)` : undefined, transition: dragging ? 'none' : 'transform 150ms ease-out' }}>
              {last ? (
                <span aria-hidden="true" className="flex h-11 w-8 shrink-0 items-center justify-center text-primary"><Plus className="h-[18px] w-[18px]" /></span>
              ) : (
                <button type="button" aria-label={fillTemplate(t.reorderOption, { number })} {...drag.handle(index)} onKeyDown={stepKeys(index)}
                  className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {quiz && !last && (
                <button type="button" role="radio" aria-checked={isCorrect} aria-label={fillTemplate(t.correctOption, { number })}
                  onClick={() => onCorrect(option.id)} className="flex h-11 w-9 shrink-0 items-center justify-center">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2',
                    isCorrect ? 'border-success bg-success text-success-foreground' : 'border-muted-foreground/50')}>
                    {isCorrect && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              )}
              <input ref={(node) => { if (node) inputs.current.set(option.id, node); else inputs.current.delete(option.id); }}
                value={option.text} maxLength={OPTION_MAX} enterKeyHint="next" aria-label={fillTemplate(t.optionPlaceholder, { number })}
                placeholder={last ? t.addOption : fillTemplate(t.optionPlaceholder, { number })} onKeyDown={nextField(index)}
                onChange={(event) => change(options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item)))}
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
              {!last && options.length > 2 && (
                <button type="button" aria-label={fillTemplate(t.removeOption, { number })}
                  onClick={() => change(options.filter((item) => item.id !== option.id), option.id)}
                  className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
                  <X className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="px-1 text-[13px] leading-snug text-muted-foreground">{quiz ? t.quizPickHint : t.optionsHint}</p>
    </div>
  );
};
