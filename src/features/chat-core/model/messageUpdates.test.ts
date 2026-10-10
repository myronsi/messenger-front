import { describe, expect, it, vi } from 'vitest';
import type { ApiMessage, Message } from '@/entities/message';
import {
  addReadReceiptUpTo,
  addReadReceipts,
  addReaction,
  applyMessageEdit,
  buildIncomingMessage,
  confirmSentMessage,
  mergeIncomingMessage,
  removeReaction,
} from './messageUpdates';
import { nid, tid } from '@/test/ids';

const msg = (n: number, extra: Partial<Message> = {}): Message => ({
  id: tid(n), sender: 'alice', sender_id: '1', content: `m${n}`, timestamp: 't', type: 'message', read_by: [], ...extra,
});

const apiMessage = (extra: Partial<ApiMessage> = {}): ApiMessage => ({
  id: '10', chat_id: '5', type: 'text', content: 'hello', attachment: null, reply_to: null, forwarded_from: null,
  sender: { id: '1', username: 'alice', display_name: 'Alice', avatar_url: null, bio: null, is_online: true, last_seen: null, is_deleted: false },
  reactions: [], read_by: [], created_at: 't', edited_at: null, is_deleted: false, ...extra,
});

describe('buildIncomingMessage', () => {
  it('maps a message from the socket and marks it own by user id', () => {
    expect(buildIncomingMessage(apiMessage(), '1')).toMatchObject({ id: '10', content: 'hello', is_own: true, is_live: true, type: 'message' });
    expect(buildIncomingMessage(apiMessage(), '2').is_own).toBe(false);
  });
});

describe('replacing the optimistic copy', () => {
  it('matches the echoed client_temp_id first', () => {
    const onResolved = vi.fn();
    const pending = msg(-5, { content: 'different text', client_temp_id: 'local-5' });
    const result = mergeIncomingMessage([pending], msg(10, { content: 'hello', client_temp_id: 'local-5' }), onResolved);
    expect(result.map((m) => nid(m.id))).toEqual([10]);
    expect(onResolved).toHaveBeenCalledWith('local-5');
  });

  it('confirms a sent message by its ack, or drops the copy when the message arrived first', () => {
    const pending = msg(-5);
    expect(confirmSentMessage([pending], 'local-5', '99', 'later')[0]).toMatchObject({ id: '99', timestamp: 'later' });
    expect(confirmSentMessage([msg(99), pending], 'local-5', '99', 'later').map((m) => m.id)).toEqual(['99']);
  });
});

describe('addReadReceiptUpTo', () => {
  it('marks every message of others at or before the read message', () => {
    const messages = [msg(1), msg(2), msg(3), msg(-4)];
    const result = addReadReceiptUpTo(messages, '2', '7', 'at');
    expect(result.map((m) => m.read_by.length)).toEqual([1, 1, 0, 0]);
    expect(addReadReceiptUpTo(messages, '3', '1', 'at')).toEqual(messages);
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
    expect(result.map((m) => nid(m.id))).toEqual([1, 10]);
    expect(result[1]).toMatchObject({ client_temp_id: 'local-5', is_own: true });
    expect(onResolved).toHaveBeenCalledWith('local-5');
  });

  it('replaces an uploading file placeholder with the same name and size', () => {
    const content = { file_url: '', file_name: 'a.png', file_type: 'image/png', file_size: 5 };
    const pending = msg(-2, { type: 'file', content, upload_status: 'uploading' });
    const incoming = msg(20, { type: 'file', content: { ...content, file_url: '/a.png' } });
    const result = mergeIncomingMessage([pending], incoming);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '20', client_temp_id: 'local-2' });
  });

  it('appends unrelated messages', () => {
    expect(mergeIncomingMessage([msg(1)], msg(2)).map((m) => nid(m.id))).toEqual([1, 2]);
  });
});

describe('applyMessageEdit', () => {
  it('updates only the edited message', () => {
    const result = applyMessageEdit([msg(1), msg(2)], '2', 'edited', 'time');
    expect(result[0].content).toBe('m1');
    expect(result[1]).toMatchObject({ content: 'edited', edited_at: 'time' });
  });
});

describe('reactions', () => {
  const reaction = { user_id: '2', reaction: '👍' };

  it('adds a reaction once', () => {
    const once = addReaction([msg(1)], '1', reaction);
    const twice = addReaction(once, '1', reaction);
    expect(twice[0].reactions).toEqual([reaction]);
  });

  it('removes a matching reaction only', () => {
    const start = [msg(1, { reactions: [reaction, { user_id: '3', reaction: '👍' }] })];
    expect(removeReaction(start, '1', '2', '👍')[0].reactions).toEqual([{ user_id: '3', reaction: '👍' }]);
  });
});

describe('addReadReceipts', () => {
  it('adds a receipt for the listed messages once per reader', () => {
    const first = addReadReceipts([msg(1), msg(2)], ['1'], '9', 'at', { username: 'bob' });
    expect(first[0].read_by).toEqual([expect.objectContaining({ user_id: '9', username: 'bob', read_at: 'at' })]);
    expect(first[1].read_by).toEqual([]);
    expect(addReadReceipts(first, ['1'], '9', 'later')[0].read_by).toHaveLength(1);
  });

  it('ignores events without a reader', () => {
    const start = [msg(1)];
    expect(addReadReceipts(start, ['1'], '', 'at')).toBe(start);
  });
});