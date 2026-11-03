import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from './types';
import { removeMessageAnimated } from './messageDeletion';

describe('removeMessageAnimated', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps a deleted message as a hidden tombstone so replies to it can say it was deleted', () => {
    vi.useFakeTimers();
    let messages: Message[] = [{ id: '1', sender: 'a', content: 'hi', timestamp: 't', type: 'message', read_by: [], reactions: [{ reaction: '👍', user_id: '2' }] }];
    const setMessages = (update: Message[] | ((previous: Message[]) => Message[])) => { messages = typeof update === 'function' ? update(messages) : update; };
    removeMessageAnimated(setMessages, '1');
    expect(messages[0].is_deleting).toBe(true);
    vi.runAllTimers();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ is_deleted: true, is_deleting: false, reactions: [] });
  });
});
