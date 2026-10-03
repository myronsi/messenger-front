import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import {
  addReadReceipts,
  addReaction,
  applyMessageEdit,
  buildMessageFromSocketEvent,
  mergeIncomingMessage,
  removeReaction,
} from './messageUpdates';
import type { NewMessageEvent } from './socketEvents';

const msg = (id: number, extra: Partial<Message> = {}): Message => ({
  id, sender: 'alice', sender_id: 1, content: `m${id}`, timestamp: 't', type: 'message', read_by: [], ...extra,
});

const event = (extra: Partial<NewMessageEvent> = {}): NewMessageEvent => ({
  type: 'message', data: { message_id: 10, content: 'hello' }, username: 'Alice', sender_id: 1, timestamp: 't', ...extra,
});

describe('buildMessageFromSocketEvent', () => {
  it('maps a text event and marks it own by user id', () => {
    const result = buildMessageFromSocketEvent(event(), { currentUserId: 1, username: 'alice' });
    expect(result).toMatchObject({ id: 10, content: 'hello', is_own: true, is_live: true, reply_to: null, type: 'message' });
  });

  it('falls back to comparing usernames without a user id', () => {
    const result = buildMessageFromSocketEvent(event({ sender_id: undefined }), { currentUserId: 0, username: 'ALICE' });
    expect(result.is_own).toBe(true);
  });

  it('uses the whole data payload as content for file events', () => {
    const data = { message_id: 11, file_url: '/f.png', file_name: 'f.png', file_type: 'image/png', file_size: 3 };
    const result = buildMessageFromSocketEvent(event({ type: 'file', data }), { currentUserId: 2, username: 'bob' });
    expect(result.content).toBe(data);
    expect(result.is_own).toBe(false);
  });
});

describe('mergeIncomingMessage', () => {
  it('replaces a message with the same id', () => {
    const result = mergeIncomingMessage([msg(1), msg(2)], msg(2, { content: 'new' }));
    expect(result.map((m) => m.content)).toEqual(['m1', 'new']);
  });

  it('replaces the optimistic text message and reports its temp id', () => {
    const onResolved = vi.fn();
    const pending = msg(-5, { content: 'hello', is_own: true });
    const result = mergeIncomingMessage([msg(1), pending], msg(10, { content: 'hello' }), onResolved);
    expect(result.map((m) => m.id)).toEqual([1, 10]);
    expect(result[1]).toMatchObject({ client_temp_id: -5, is_own: true });
    expect(onResolved).toHaveBeenCalledWith(-5);
  });

  it('replaces an uploading file placeholder with the same name and size', () => {
    const content = { file_url: '', file_name: 'a.png', file_type: 'image/png', file_size: 5 };
    const pending = msg(-2, { type: 'file', content, upload_status: 'uploading' });
    const incoming = msg(20, { type: 'file', content: { ...content, file_url: '/a.png' } });
    const result = mergeIncomingMessage([pending], incoming);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 20, client_temp_id: -2 });
  });

  it('appends unrelated messages', () => {
    expect(mergeIncomingMessage([msg(1)], msg(2)).map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('applyMessageEdit', () => {
  it('updates only the edited message', () => {
    const result = applyMessageEdit([msg(1), msg(2)], 2, 'edited', 'time');
    expect(result[0].content).toBe('m1');
    expect(result[1]).toMatchObject({ content: 'edited', edited_at: 'time' });
  });
});

describe('reactions', () => {
  const reaction = { user_id: 2, reaction: '👍' };

  it('adds a reaction once', () => {
    const once = addReaction([msg(1)], 1, reaction);
    const twice = addReaction(once, 1, reaction);
    expect(twice[0].reactions).toEqual([reaction]);
  });

  it('removes a matching reaction only', () => {
    const start = [msg(1, { reactions: [reaction, { user_id: 3, reaction: '👍' }] })];
    expect(removeReaction(start, 1, 2, '👍')[0].reactions).toEqual([{ user_id: 3, reaction: '👍' }]);
  });
});

describe('addReadReceipts', () => {
  it('adds a receipt for the listed messages once per reader', () => {
    const first = addReadReceipts([msg(1), msg(2)], [1], 9, 'at', { username: 'bob' });
    expect(first[0].read_by).toEqual([expect.objectContaining({ user_id: 9, username: 'bob', read_at: 'at' })]);
    expect(first[1].read_by).toEqual([]);
    expect(addReadReceipts(first, [1], 9, 'later')[0].read_by).toHaveLength(1);
  });

  it('ignores events without a reader', () => {
    const start = [msg(1)];
    expect(addReadReceipts(start, [1], 0, 'at')).toBe(start);
  });
});