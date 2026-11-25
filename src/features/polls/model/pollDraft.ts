import type { PollCreate } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';

export const MAX_OPTIONS = 10;
export const QUESTION_MAX = 300;
export const OPTION_MAX = 100;
export const EXPLANATION_MAX = 200;
const MIN_CLOSE_MS = 5 * 60_000;
const MAX_CLOSE_MS = 30 * 24 * 3_600_000;

export interface DraftOption {
  id: number;
  text: string;
}

export interface PollDraft {
  question: string;
  options: DraftOption[];
  anonymous: boolean;
  multiple: boolean;
  quiz: boolean;
  correct: number | null;
  explanation: string;
  closeAtOn: boolean;
  closeAt: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

export const localInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const emptyDraft = (now = Date.now()): PollDraft => ({
  question: '',
  options: [{ id: 1, text: '' }, { id: 2, text: '' }],
  anonymous: true,
  multiple: false,
  quiz: false,
  correct: null,
  explanation: '',
  closeAtOn: false,
  closeAt: localInputValue(new Date(now + 24 * 3_600_000)),
});

export const freshCloseAt = (current: string, now = Date.now()) => {
  const at = Date.parse(current);
  return Number.isFinite(at) && at - now >= MIN_CLOSE_MS ? current : localInputValue(new Date(now + 24 * 3_600_000));
};

export const moveOption = (options: DraftOption[], index: number, step: -1 | 1) => {
  const target = index + step;
  if (target < 0 || target >= options.length) return options;
  const next = [...options];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

type Words = Translations['polls'];

export const draftProblem = (draft: PollDraft, words: Words, now = Date.now()): string | null => {
  if (!draft.question.trim()) return words.questionRequired;
  const filled = draft.options.map((option) => option.text.trim()).filter(Boolean);
  if (filled.length < 2) return words.optionsRequired;
  if (new Set(filled).size !== filled.length) return words.duplicateOptions;
  if (draft.quiz && !draft.options.some((option) => option.id === draft.correct && option.text.trim())) return words.quizNeedsAnswer;
  if (draft.closeAtOn) {
    const at = Date.parse(draft.closeAt);
    if (!Number.isFinite(at) || at - now < MIN_CLOSE_MS || at - now > MAX_CLOSE_MS) return words.closeAtRange;
  }
  return null;
};

export const buildPoll = (draft: PollDraft): PollCreate => {
  const filled = draft.options.filter((option) => option.text.trim());
  const explanation = draft.explanation.trim();
  return {
    question: draft.question.trim(),
    options: filled.map((option) => option.text.trim()),
    multiple_answers: draft.quiz ? false : draft.multiple,
    anonymous: draft.anonymous,
    ...(draft.quiz ? { quiz: { correct_option: filled.findIndex((option) => option.id === draft.correct), ...(explanation ? { explanation } : {}) } } : {}),
    ...(draft.closeAtOn ? { close_at: new Date(Date.parse(draft.closeAt)).toISOString() } : {}),
  };
};
