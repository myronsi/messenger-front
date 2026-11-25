import type { PollCreate } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';

export const MAX_OPTIONS = 10;
export const QUESTION_MAX = 300;
export const OPTION_MAX = 100;
export const EXPLANATION_MAX = 200;
const MIN_CLOSE_MS = 5 * 60_000;
const MAX_CLOSE_MS = 30 * 24 * 3_600_000;
const HOUR_MS = 3_600_000;

export type ClosePreset = 'hour' | 'day' | 'threeDays' | 'week' | 'custom';

export const CLOSE_PRESETS: { id: Exclude<ClosePreset, 'custom'>; ms: number }[] = [
  { id: 'hour', ms: HOUR_MS },
  { id: 'day', ms: 24 * HOUR_MS },
  { id: 'threeDays', ms: 72 * HOUR_MS },
  { id: 'week', ms: 168 * HOUR_MS },
];

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
  closePreset: ClosePreset;
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
  closePreset: 'day',
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

export const moveOptionTo = (options: DraftOption[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= options.length || to >= options.length) return options;
  const next = [...options];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
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

export const presetCloseAt = (preset: ClosePreset, current: string, now = Date.now()) => {
  const found = CLOSE_PRESETS.find((item) => item.id === preset);
  return found ? localInputValue(new Date(now + found.ms)) : freshCloseAt(current, now);
};

export const withTrailingOption = (options: DraftOption[], nextId: () => number) => {
  let list = options;
  while (list.length > 2 && !list[list.length - 1].text && !list[list.length - 2].text) list = list.slice(0, -1);
  if (list.length < MAX_OPTIONS && list[list.length - 1]?.text) list = [...list, { id: nextId(), text: '' }];
  return list;
};

export const isTrailingOption = (options: DraftOption[], index: number) => index === options.length - 1 && index >= 2 && !options[index].text;

export const previewPoll = (draft: PollDraft, words: Words): PollCreate => {
  const filled = draft.options.map((option) => option.text.trim()).filter(Boolean);
  const placeholders = [1, 2].map((number) => fillTemplate(words.optionPlaceholder, { number: String(number) }));
  const closeAt = Date.parse(draft.closeAt);
  return {
    question: draft.question.trim() || words.questionPlaceholder,
    options: filled.length ? filled : placeholders,
    multiple_answers: !draft.quiz && draft.multiple,
    anonymous: draft.anonymous,
    ...(draft.quiz ? { quiz: { correct_option: 0 } } : {}),
    ...(draft.closeAtOn && Number.isFinite(closeAt) ? { close_at: new Date(closeAt).toISOString() } : {}),
  };
};
