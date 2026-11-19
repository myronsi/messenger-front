import { describe, expect, it } from 'vitest';
import { applyModerationRemoval, moderationRule } from './moderationRemoval';
import type { Message } from './types';

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'Eve', content: 'buy now', timestamp: '2026-11-19T10:00:00Z', type: 'message', read_by: [],
  reactions: [{ reaction: 'like', user_id: '1' }], ...extra,
});

describe('applyModerationRemoval', () => {
  it('clears the content and marks only that message', () => {
    const next = applyModerationRemoval([message('1'), message('2')], '2', { code: 'spam', text: 'Ads' });
    expect(next[0]).toEqual(message('1'));
    expect(next[1]).toMatchObject({
      content: '', reactions: [], is_deleted: true, removed_by_moderation: true, moderation_reason: { code: 'spam', text: 'Ads' },
    });
  });

  it('keeps a reason it already had when the event carries none', () => {
    const [next] = applyModerationRemoval([message('1', { moderation_reason: { code: 'scam', text: '' } })], '1');
    expect(next.moderation_reason).toEqual({ code: 'scam', text: '' });
  });
});

describe('moderationRule', () => {
  it('maps unknown codes to other', () => {
    expect(moderationRule('illegal')).toBe('illegal');
    expect(moderationRule('new_rule')).toBe('other');
    expect(moderationRule(undefined)).toBe('other');
  });
});
