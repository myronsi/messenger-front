import type { EntityId } from '@/shared/api/entityId';
import { describe, expect, it } from 'vitest';
import type { Message } from '@/entities/message';
import {
  appendUniqueMessages,
  mergeFreshHistoryMessages,
  normalizeHistoryMessage,
  placeFailedMessagesByTime,
  prependOlderPage,
  prependUniqueMessages,
  trimNewestMessages,
} from './historyNormalizers';

const msg = (id: EntityId, extra: Partial<Message> = {}): Message => ({
  id, sender: 'alice', content: `m${id}`, timestamp: '2024-01-01T00:00:00Z', type: 'message', read_by: [], ...extra,
});

const ids = (messages: Message[]) => messages.map((message) => message.id);

describe('normalizeHistoryMessage', () => {
  it('parses JSON columns delivered as strings', () => {
    const result = normalizeHistoryMessage({
      ...msg(1),
      reactions: '[{"user_id":2,"reaction":"x"}]',
      read_by: '[{"user_id":3,"read_at":"t"}]',
    });
    expect(result.reactions).toEqual([{ user_id: 2, reaction: 'x' }]);
    expect(result.read_by).toEqual([{ user_id: 3, read_at: 't' }]);
  });

  it('falls back to empty arrays for invalid JSON or missing columns', () => {
    const result = normalizeHistoryMessage({ ...msg(1), reactions: '{oops', read_by: undefined });
    expect(result.reactions).toEqual([]);
    expect(result.read_by).toEqual([]);
  });

  it('parses the JSON content of file messages only', () => {
    const file = normalizeHistoryMessage({ ...msg(1), type: 'file', content: '{"file_url":"/a.png"}' });
    expect(file.content).toEqual({ file_url: '/a.png' });
    const text = normalizeHistoryMessage({ ...msg(2), content: '{"file_url":"/a.png"}' });
    expect(text.content).toBe('{"file_url":"/a.png"}');
  });

  it('defaults type and reply_to', () => {
    const result = normalizeHistoryMessage({ ...msg(1), type: undefined, reply_to: 0 });
    expect(result.type).toBe('message');
    expect(result.reply_to).toBeNull();
  });

  it('keeps absolute avatar urls untouched', () => {
    const result = normalizeHistoryMessage({ ...msg(1), avatar_url: 'https://cdn.example/a.png' });
    expect(result.avatar_url).toBe('https://cdn.example/a.png');
  });
});

describe('prependUniqueMessages', () => {
  it('puts older messages first and skips ones already loaded', () => {
    expect(ids(prependUniqueMessages([msg(3), msg(4)], [msg(1), msg(2), msg(3)]))).toEqual([1, 2, 3, 4]);
  });
});

describe('prependUniqueMessages fast path', () => {
  it('keeps the loaded array unchanged when the page holds nothing new', () => {
    const current = [msg(3), msg(4)];
    expect(prependUniqueMessages(current, [msg(3)])).toBe(current);
  });

  it('prepends an ordered older page without moving pending sends', () => {
    expect(ids(prependUniqueMessages([msg('9007199254740995'), msg(-1)], [msg('9007199254740993'), msg('9007199254740994')])))
      .toEqual(['9007199254740993', '9007199254740994', '9007199254740995', -1]);
  });

  it('sorts when the page overlaps or arrives out of order', () => {
    expect(ids(prependUniqueMessages([msg(2), msg(5)], [msg(4), msg(1)]))).toEqual([1, 2, 4, 5]);
  });
});

describe('prependOlderPage', () => {
  it('prepends and trims the newest messages in one result', () => {
    const page = prependOlderPage([msg(3), msg(4), msg(-1)], [msg(1), msg(2)], 3);
    expect(ids(page.messages)).toEqual([1, 2, 3, -1]);
    expect(page.newestId).toBe(3);
  });

  it('reports no trim while the window stays under the limit', () => {
    const page = prependOlderPage([msg(3)], [msg(1), msg(2)], 5);
    expect(ids(page.messages)).toEqual([1, 2, 3]);
    expect(page.newestId).toBeNull();
  });
});

describe('appendUniqueMessages', () => {
  it('appends only unseen messages', () => {
    expect(ids(appendUniqueMessages([msg(1), msg(2)], [msg(2), msg(3)]))).toEqual([1, 2, 3]);
  });

  it('sorts confirmed messages and keeps unsent ones at the end', () => {
    expect(ids(appendUniqueMessages([msg(5), msg(-1)], [msg(3), msg(4)]))).toEqual([3, 4, 5, -1]);
  });
});

describe('trimNewestMessages', () => {
  it('returns null while under the limit', () => {
    expect(trimNewestMessages([msg(1), msg(2)], 2)).toBeNull();
  });

  it('drops the newest confirmed messages and keeps unsent ones', () => {
    const result = trimNewestMessages([msg(1), msg(2), msg(3), msg(-1)], 2);
    expect(result && ids(result.messages)).toEqual([1, 2, -1]);
    expect(result?.newestId).toBe(2);
  });
});

describe('mergeFreshHistoryMessages', () => {
  it('retains live messages that arrived after the history snapshot', () => {
    const live = msg('9007199254740993', { is_live: true });
    expect(ids(mergeFreshHistoryMessages([live], [msg('9007199254740992')]))).toEqual(['9007199254740992', '9007199254740993']);
    expect(ids(mergeFreshHistoryMessages([live], []))).toEqual(['9007199254740993']);
  });
  it('keeps only unsent messages when the fresh page is empty', () => {
    expect(ids(mergeFreshHistoryMessages([msg(1), msg(-1)], []))).toEqual([-1]);
  });

  it('keeps older loaded messages, replaces the window and keeps pending ones', () => {
    const result = mergeFreshHistoryMessages([msg(1), msg(5), msg(-1)], [msg(5), msg(6)]);
    expect(ids(result)).toEqual([1, 5, 6, -1]);
  });

  it('preserves local flags of messages that were already loaded', () => {
    const current = msg(5, { is_own: true, client_temp_id: -9 });
    const result = mergeFreshHistoryMessages([current], [msg(5)]);
    expect(result[0].is_own).toBe(true);
    expect(result[0].client_temp_id).toBe(-9);
  });

  it('drops messages missing inside the fetched range and keeps the ones outside it', () => {
    const current = [msg('2'), msg('4'), msg('8'), msg(-3, { client_temp_id: -3 })];
    expect(ids(mergeFreshHistoryMessages(current, [msg('3'), msg('5')]))).toEqual(['2', '3', '5', '8', -3]);
  });

  it('extends the range to the open ends of the newest page but keeps live messages after it', () => {
    const current = [msg('1'), msg('4'), msg('8'), msg('9', { is_live: true })];
    const result = mergeFreshHistoryMessages(current, [msg('3'), msg('5')], { hasMoreBefore: false, hasMoreAfter: false });
    expect(ids(result)).toEqual(['3', '5', '9']);
  });

  it('drops an older cached block that does not reach the fresh page when more history exists before it', () => {
    const current = [msg('851'), msg('900'), msg(-1)];
    const result = mergeFreshHistoryMessages(current, [msg('951'), msg('1000')], { hasMoreBefore: true, hasMoreAfter: false });
    expect(ids(result)).toEqual(['951', '1000', -1]);
  });

  it('keeps older cached messages when the cache overlaps the fresh page', () => {
    const current = [msg('851'), msg('900'), msg('960')];
    const result = mergeFreshHistoryMessages(current, [msg('951'), msg('960'), msg('1000')], { hasMoreBefore: true, hasMoreAfter: false });
    expect(ids(result)).toEqual(['851', '900', '951', '960', '1000']);
  });

  it('merges as before when the server reports no older history or no range', () => {
    const current = [msg('851'), msg('900'), msg(-1)];
    const result = mergeFreshHistoryMessages(current, [msg('951'), msg('1000')], { hasMoreBefore: false, hasMoreAfter: true });
    expect(ids(result)).toEqual(['951', '1000', -1]);
    expect(ids(mergeFreshHistoryMessages(current, [msg('951'), msg('1000')]))).toEqual(['851', '900', '951', '1000', -1]);
  });
});

describe('placeFailedMessagesByTime', () => {
  const at = (id: Message['id'], timestamp: string, extra: Partial<Message> = {}) =>
    ({ id, sender: 'me', content: String(id), timestamp, type: 'message', read_by: [], ...extra }) as Message;

  it('keeps failed sends where they were written and newer confirmed messages after them', () => {
    const order = placeFailedMessagesByTime([
      at('1', '2026-11-12T10:00:00Z'),
      at('2', '2026-11-12T10:05:00Z'),
      at(-1, '2026-11-12T10:01:00Z', { delivery_error: 'slow down' }),
      at(-2, '2026-11-12T10:02:00Z', { delivery_error: 'slow down' }),
      at(-3, '2026-11-12T10:06:00Z'),
    ]);
    expect(order.map(message => message.id)).toEqual(['1', -1, -2, '2', -3]);
  });

  it('keeps the same array when nothing failed', () => {
    const messages = [at('1', '2026-11-12T10:00:00Z'), at(-3, '2026-11-12T10:06:00Z')];
    expect(placeFailedMessagesByTime(messages)).toBe(messages);
  });
});
