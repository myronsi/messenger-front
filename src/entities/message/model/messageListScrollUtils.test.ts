import { describe, expect, it } from 'vitest';
import type { Message } from './types';
import { getAppendedMessages, isValidTimestamp } from './messageListScrollUtils';

const msg = (id: number): Message => ({
  id, sender: 'a', content: '', timestamp: 't', type: 'message', read_by: [],
});

describe('getAppendedMessages', () => {
  it('returns nothing for an empty previous list', () => {
    expect(getAppendedMessages([], [msg(1)])).toEqual([]);
  });

  it('returns the messages after the previous last one', () => {
    expect(getAppendedMessages([msg(1), msg(2)], [msg(1), msg(2), msg(3), msg(4)]).map((m) => m.id)).toEqual([3, 4]);
  });

  it('returns nothing when the previous tail is gone (history replaced)', () => {
    expect(getAppendedMessages([msg(1), msg(2)], [msg(5), msg(6)])).toEqual([]);
  });
});

describe('isValidTimestamp', () => {
  it('accepts parsable timestamps and rejects empty or garbage ones', () => {
    expect(isValidTimestamp('2024-01-01T10:00:00Z')).toBe(true);
    expect(isValidTimestamp('')).toBe(false);
    expect(isValidTimestamp(null)).toBe(false);
    expect(isValidTimestamp('not a date')).toBe(false);
  });
});