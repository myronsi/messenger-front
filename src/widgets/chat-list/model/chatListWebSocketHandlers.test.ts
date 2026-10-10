import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import type { ServerEvent } from '@/shared/api/realtime';
import type { Schema } from '@/shared/api/contract';
import { rememberUser } from '@/shared/lib/userDirectory';
import { handleChatListWebSocketMessage } from './chatListWebSocketHandlers';
import type { ChatListWebSocketContext } from './chatListWebSocketHandlers';
import type { ChatOverrideMap, PresenceMap } from './types';
import type { Id } from '@/shared/lib/ids';

const ref = <T,>(current: T) => ({ current }) as MutableRefObject<T>;

const setup = (overrides: Partial<{ userId: Id; activeChatId: Id }> = {}) => {
  let state: ChatOverrideMap = {};
  let presence: PresenceMap = {};
  const refetch = vi.fn();
  const onChatDeleted = vi.fn();
  const setChatOverrides = ((update: SetStateAction<ChatOverrideMap>) => {
    state = typeof update === 'function' ? update(state) : update;
  }) as Dispatch<SetStateAction<ChatOverrideMap>>;
  const setPresenceByUsername = ((update: SetStateAction<PresenceMap>) => {
    presence = typeof update === 'function' ? update(presence) : update;
  }) as Dispatch<SetStateAction<PresenceMap>>;
  const ctx = {
    usernameRef: ref('me'),
    activeChatIdRef: ref<Id | undefined>(overrides.activeChatId),
    activeChatNameRef: ref<string | undefined>(undefined),
    onChatOpenRef: ref(vi.fn()),
    onChatDeletedRef: ref<((chatId: Id) => void) | undefined>(onChatDeleted),
    currentUserIdRef: ref<Id | undefined>(overrides.userId ?? '1'),
    chatsByIdRef: ref({ 5: { id: '5', unread_count: 0 } as unknown as Chat }),
    refetchRef: ref(refetch),
    refetchRequestInboxRef: ref(vi.fn()),
    setChatOverrides,
    setPresenceByUsername,
    setModal: vi.fn(),
  } as unknown as ChatListWebSocketContext;
  return { ctx, refetch, onChatDeleted, getState: () => state, getPresence: () => presence };
};

const sender = (id: string): Schema<'User'> => ({
  id, username: `u${id}`, display_name: `U${id}`, avatar_url: null, bio: null, is_online: true, last_seen: null, is_deleted: false,
});

const message = (id: string, senderId: string): Schema<'Message'> => ({
  id, chat_id: '5', type: 'text', sender: sender(senderId), content: 'hi', attachment: null, reply_to: null,
  forwarded_from: null, reactions: [], read_by: [], created_at: 't', edited_at: null, is_deleted: false,
});

const incoming = (id = '100', senderId = '2', chatId = '5'): ServerEvent => ({
  type: 'message', event_id: 'e', chat_id: chatId, data: { message: message(id, senderId) },
});

describe('handleChatListWebSocketMessage', () => {
  it('refetches and notifies when a chat is deleted', () => {
    const { ctx, refetch, onChatDeleted } = setup();
    handleChatListWebSocketMessage({ type: 'chat_deleted', event_id: 'e', chat_id: '5', data: {} }, ctx);
    expect(onChatDeleted).toHaveBeenCalledWith('5');
    expect(refetch).toHaveBeenCalled();
  });

  it('counts a message from someone else in a background chat as unread, once', () => {
    const { ctx, getState } = setup();
    handleChatListWebSocketMessage(incoming(), ctx);
    handleChatListWebSocketMessage(incoming(), ctx);
    expect(getState()['5']).toMatchObject({ unread_count: 1, last_counted_message_id: '100' });
    expect(getState()['5'].last_message?.id).toBe('100');
  });

  it('does not count own messages or messages in the open chat', () => {
    const own = setup();
    handleChatListWebSocketMessage(incoming('100', '1'), own.ctx);
    expect(own.getState()['5'].unread_count).toBe(0);

    const open = setup({ activeChatId: '5' });
    handleChatListWebSocketMessage(incoming(), open.ctx);
    expect(open.getState()['5'].unread_count).toBe(0);
  });

  it('refetches for a message in a chat the list does not know yet', () => {
    const { ctx, refetch } = setup();
    handleChatListWebSocketMessage(incoming('100', '2', '77'), ctx);
    expect(refetch).toHaveBeenCalled();
  });

  it('applies the server entry of chat_list_update', () => {
    const { ctx, getState } = setup();
    handleChatListWebSocketMessage({
      type: 'chat_list_update', event_id: 'e', chat_id: '5',
      data: {
        chat: {
          id: '5', type: 'direct', name: 'u2', avatar_url: null, peer: sender('2'), is_pinned: true, unread_count: 3,
          last_message: message('120', '2'), created_at: 't',
        },
      },
    }, ctx);
    expect(getState()['5']).toMatchObject({ unread_count: 3, is_pinned: true, last_counted_message_id: '120' });
  });

  it('maps presence by user id to the username', () => {
    rememberUser('42', 'carol');
    const { ctx, getPresence } = setup();
    handleChatListWebSocketMessage({ type: 'presence', event_id: 'e', chat_id: null, data: { user_id: '42', is_online: false, last_seen: 'then' } }, ctx);
    expect(getPresence()).toEqual({ carol: { is_online: false, last_seen: 'then' } });
  });
});
