import { describe, expect, it } from 'vitest';
import type { Message } from '@/entities/message';
import {
  appendUniqueMessages,
  mergeFreshHistoryMessages,
  normalizeHistoryMessage,
  prependUniqueMessages,
  trimNewestMessages,
} from './historyNormalizers';
import { nid, tid } from '@/test/ids';

const msg = (n: number, extra: Partial<Message> = {}): Message => ({
  id: tid(n), sender: 'alice', content: `m${n}`, timestamp: '2024-01-01T00:00:00Z', type: 'message', read_by: [], ...extra,
});

const ids = (messages: Message[]) => messages.map((message) => nid(message.id));

describe('normalizeHistoryMessage', () => {
  it('parses JSON columns delivered as strings', () => {
    const result = normalizeHistoryMessage({
      ...msg(1),
      reactions: '[{"user_id":"2","reaction":"x"}]',
      read_by: '[{"user_id":"3","read_at":"t"}]',
    });
    expect(result.reactions).toEqual([{ user_id: '2', reaction: 'x' }]);
    expect(result.read_by).toEqual([{ user_id: '3', read_at: 't' }]);
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
    const result = normalizeHistoryMessage({ ...msg(1), type: undefined, reply_to: '' });
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
    expect(result?.newestId).toBe('2');
  });
});

describe('mergeFreshHistoryMessages', () => {
  it('keeps only unsent messages when the fresh page is empty', () => {
    expect(ids(mergeFreshHistoryMessages([msg(1), msg(-1)], []))).toEqual([-1]);
  });

  it('keeps older loaded messages, replaces the window and keeps pending ones', () => {
    const result = mergeFreshHistoryMessages([msg(1), msg(5), msg(-1)], [msg(5), msg(6)]);
    expect(ids(result)).toEqual([1, 5, 6, -1]);
  });

  it('preserves local flags of messages that were already loaded', () => {
    const current = msg(5, { is_own: true, client_temp_id: 'local-9' });
    const result = mergeFreshHistoryMessages([current], [msg(5)]);
    expect(result[0].is_own).toBe(true);
    expect(result[0].client_temp_id).toBe('local-9');
  });
});