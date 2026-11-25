import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { buildPoll, draftProblem, emptyDraft, localInputValue, moveOption, type PollDraft } from './pollDraft';

const NOW = Date.parse('2026-11-25T10:00:00Z');
const t = en.polls;
const draft = (extra: Partial<PollDraft> = {}): PollDraft => ({
  ...emptyDraft(NOW), question: 'Lunch?', options: [{ id: 1, text: 'Pizza' }, { id: 2, text: 'Soup' }, { id: 3, text: '  ' }], ...extra,
});

describe('poll draft', () => {
  it('starts anonymous with two empty options', () => {
    const empty = emptyDraft(NOW);
    expect(empty).toMatchObject({ anonymous: true, multiple: false, quiz: false, closeAtOn: false });
    expect(empty.options).toHaveLength(2);
  });

  it('names what is missing before it can be created', () => {
    expect(draftProblem(draft({ question: '  ' }), t, NOW)).toBe(t.questionRequired);
    expect(draftProblem(draft({ options: [{ id: 1, text: 'Pizza' }, { id: 2, text: '' }] }), t, NOW)).toBe(t.optionsRequired);
    expect(draftProblem(draft({ options: [{ id: 1, text: 'Pizza' }, { id: 2, text: ' Pizza ' }] }), t, NOW)).toBe(t.duplicateOptions);
    expect(draftProblem(draft({ quiz: true }), t, NOW)).toBe(t.quizNeedsAnswer);
    expect(draftProblem(draft({ quiz: true, correct: 3 }), t, NOW)).toBe(t.quizNeedsAnswer);
    expect(draftProblem(draft({ quiz: true, correct: 2 }), t, NOW)).toBeNull();
  });

  it('accepts a closing time between 5 minutes and 30 days ahead', () => {
    const at = (ms: number) => draft({ closeAtOn: true, closeAt: localInputValue(new Date(NOW + ms)) });
    expect(draftProblem(at(60_000), t, NOW)).toBe(t.closeAtRange);
    expect(draftProblem(at(10 * 60_000), t, NOW)).toBeNull();
    expect(draftProblem(at(31 * 24 * 3_600_000), t, NOW)).toBe(t.closeAtRange);
  });

  it('sends trimmed options and the quiz answer counted among the filled options', () => {
    const quiz = draft({ options: [{ id: 1, text: ' ' }, { id: 2, text: 'Pizza ' }, { id: 3, text: 'Soup' }], quiz: true, correct: 3, multiple: true, explanation: ' Friday ' });
    expect(buildPoll(quiz)).toEqual({
      question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true, quiz: { correct_option: 1, explanation: 'Friday' },
    });
  });

  it('sends multiple answers, public votes and the closing time', () => {
    const closeAt = localInputValue(new Date(NOW + 3_600_000));
    expect(buildPoll(draft({ multiple: true, anonymous: false, closeAtOn: true, closeAt }))).toEqual({
      question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: true, anonymous: false, close_at: new Date(Date.parse(closeAt)).toISOString(),
    });
  });

  it('moves options up and down within the list', () => {
    const options = draft().options;
    expect(moveOption(options, 1, -1).map((option) => option.id)).toEqual([2, 1, 3]);
    expect(moveOption(options, 0, -1)).toBe(options);
    expect(moveOption(options, 2, 1)).toBe(options);
  });
});
