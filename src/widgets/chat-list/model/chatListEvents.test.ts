import { describe, expect, it } from 'vitest';
import type { SetStateAction } from 'react';
import type { ServerEvent } from '@myronsi/messenger-api';
import type { Chat } from '@/entities/message';
import { applyChatListEvent } from './chatListEvents';
import type { ChatOverrideMap, PresenceMap } from './types';

const ME = '1';
const BOB = '2';
const CAROL = '3';

const chat = (id: string, extra: Partial<Chat> = {}): Chat => ({
  id, name: 'bob', interlocutor_id: BOB, interlocutor_name: 'bob', avatar_url: '', interlocutor_deleted: false,
  type: 'one-on-one', unread_count: 0, first_unread_message_id: null, last_message: null, ...extra,
});

const lastMessage = (id: string, senderId = ME) => ({
  id, sender_id: senderId, sender_name: 'Me', content: 'old', type: 'message' as const, timestamp: '2026-11-24T09:00:00Z',
});

const message = (id: string, chatId: string, senderId: string, extra: Record<string, unknown> = {}) => ({
  id, chat_id: chatId, type: 'text', content: `text ${id}`, created_at: '2026-11-24T10:00:00Z', reactions: [],
  sender: { id: senderId, username: senderId === ME ? 'me' : 'bob', display_name: senderId === ME ? 'Me' : 'Bob' }, ...extra,
});

const frame = (type: string, chatId: string | null, data: Record<string, unknown>) =>
  ({ type, event_id: `${type}-${Math.random()}`, chat_id: chatId, data }) as unknown as ServerEvent;

const harness = (chats: Chat[], activeChatId?: string) => {
  let overrides: ChatOverrideMap = {};
  let presence: PresenceMap = {};
  const apply = <T,>(current: T, action: SetStateAction<T>) => (typeof action === 'function' ? (action as (prev: T) => T)(current) : action);
  const ctx = {
    chats: Object.fromEntries(chats.map((item) => [item.id, item])) as Record<string, Chat>,
    currentUserId: ME,
    activeChatId,
    setChatOverrides: (action: SetStateAction<ChatOverrideMap>) => { overrides = apply(overrides, action); },
    setPresenceByUsername: (action: SetStateAction<PresenceMap>) => { presence = apply(presence, action); },
  };
  return { send: (event: ServerEvent) => applyChatListEvent(event, ctx), overrides: () => overrides, presence: () => presence };
};

describe('applyChatListEvent', () => {
  it('moves a new message into the chat row and counts it once', () => {
    const list = harness([chat('10', { last_message: lastMessage('100') })]);
    const event = frame('message', '10', { message: message('101', '10', BOB) });
    expect(list.send(event)).toBe(true);
    expect(list.send(event)).toBe(true);
    const row = list.overrides()['10'];
    expect(row.last_message?.id).toBe('101');
    expect(row.last_message?.sender_id).toBe(BOB);
    expect(row.unread_count).toBe(1);
    expect(row.first_unread_message_id).toBe('101');
  });

  it('does not count own messages or messages in the open chat', () => {
    const own = harness([chat('10')]);
    own.send(frame('message', '10', { message: message('101', '10', ME) }));
    expect(own.overrides()['10'].unread_count).toBe(0);
    expect(own.overrides()['10'].last_message?.id).toBe('101');

    const open = harness([chat('10')], '10');
    open.send(frame('message', '10', { message: message('101', '10', BOB) }));
    expect(open.overrides()['10'].unread_count).toBe(0);
  });

  it('counts mentions of the current user and @all', () => {
    const list = harness([chat('10', { type: 'group' }), chat('11', { type: 'group' })]);
    list.send(frame('message', '10', { message: message('101', '10', BOB, { mentions: [ME] }) }));
    list.send(frame('message', '11', { message: message('102', '11', BOB, { mentions_all: true }) }));
    list.send(frame('message', '11', { message: message('103', '11', BOB, { mentions: [CAROL] }) }));
    expect(list.overrides()['10'].unread_mentions_count).toBe(1);
    expect(list.overrides()['11'].unread_mentions_count).toBe(1);
    expect(list.overrides()['11'].unread_count).toBe(2);
  });

  it('asks for a reload when a message arrives in an unknown chat', () => {
    const list = harness([chat('10')]);
    expect(list.send(frame('message', '99', { message: message('101', '99', BOB) }))).toBe(false);
    expect(list.overrides()).toEqual({});
  });

  it('clears the unread count when the current user read up to the last message', () => {
    const list = harness([chat('10', { last_message: lastMessage('105', BOB), unread_count: 3, unread_mentions_count: 1, first_unread_message_id: '103' })]);
    expect(list.send(frame('read', '10', { message_id: '105', user_id: ME, read_at: '2026-11-24T10:00:00Z' }))).toBe(true);
    expect(list.overrides()['10']).toMatchObject({ unread_count: 0, unread_mentions_count: 0, first_unread_message_id: null });
  });

  it('asks for a reload when the current user read only part of the chat', () => {
    const list = harness([chat('10', { last_message: lastMessage('105', BOB), unread_count: 3 })]);
    expect(list.send(frame('read', '10', { message_id: '104', user_id: ME, read_at: '2026-11-24T10:00:00Z' }))).toBe(false);
    expect(list.overrides()).toEqual({});
  });

  it('adds a read receipt to the last message when someone else read it', () => {
    const list = harness([chat('10', { last_message: lastMessage('105') })]);
    expect(list.send(frame('read', '10', { message_id: '105', user_id: BOB, read_at: '2026-11-24T10:00:00Z' }))).toBe(true);
    expect(list.overrides()['10'].last_message?.read_by).toEqual([{ user_id: BOB, read_at: '2026-11-24T10:00:00Z' }]);
  });

  it('updates presence by the direct chat partner', () => {
    const list = harness([chat('10')]);
    expect(list.send(frame('presence', null, { user_id: BOB, is_online: true, last_seen: null }))).toBe(true);
    expect(list.send(frame('presence', null, { user_id: CAROL, is_online: true, last_seen: null }))).toBe(true);
    expect(list.presence()).toEqual({ bob: { is_online: true, last_seen: null } });
  });

  it('reloads only when the deleted message was the last one', () => {
    const list = harness([chat('10', { last_message: lastMessage('105') })]);
    expect(list.send(frame('delete', '10', { message_id: '104', scope: 'everyone' }))).toBe(true);
    expect(list.send(frame('delete', '10', { message_id: '105', scope: 'everyone' }))).toBe(false);
  });

  it('replaces the last message after an edit and ignores edits of older ones', () => {
    const list = harness([chat('10', { last_message: lastMessage('105') })]);
    list.send(frame('edit', '10', { message: message('104', '10', ME) }));
    expect(list.overrides()).toEqual({});
    list.send(frame('edit', '10', { message: message('105', '10', ME, { content: 'edited' }) }));
    expect(list.overrides()['10'].last_message?.content).toBe('edited');
  });

  it('leaves structural events to a reload', () => {
    const list = harness([chat('10')]);
    expect(list.send(frame('chat_created', '11', {}))).toBe(false);
    expect(list.send(frame('group_updated', '10', {}))).toBe(false);
  });
});
