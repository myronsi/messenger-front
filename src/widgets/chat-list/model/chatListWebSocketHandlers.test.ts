import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { handleChatListWebSocketMessage } from './chatListWebSocketHandlers';
import type { ChatListWebSocketContext } from './chatListWebSocketHandlers';
import type { ChatOverrideMap, WebSocketMessage } from './types';

const ref = <T,>(current: T) => ({ current }) as MutableRefObject<T>;

const setup = (overrides: Partial<{ userId: number; activeChatId: number }> = {}) => {
  let state: ChatOverrideMap = {};
  const refetch = vi.fn();
  const onChatDeleted = vi.fn();
  const setChatOverrides = ((update: SetStateAction<ChatOverrideMap>) => {
    state = typeof update === 'function' ? update(state) : update;
  }) as Dispatch<SetStateAction<ChatOverrideMap>>;
  const ctx = {
    usernameRef: ref('me'),
    activeChatIdRef: ref<number | undefined>(overrides.activeChatId),
    activeChatNameRef: ref<string | undefined>(undefined),
    onChatOpenRef: ref(vi.fn()),
    onChatDeletedRef: ref<((chatId: number) => void) | undefined>(onChatDeleted),
    currentUserIdRef: ref<number | undefined>(overrides.userId ?? 1),
    chatsByIdRef: ref({}),
    refetchRef: ref(refetch),
    refetchRequestInboxRef: ref(vi.fn()),
    setChatOverrides,
    setPresenceByUsername: vi.fn(),
    setModal: vi.fn(),
  } as unknown as ChatListWebSocketContext;
  return { ctx, refetch, onChatDeleted, getState: () => state };
};

const incoming = (extra: Partial<WebSocketMessage> = {}) => ({
  type: 'chat_list_message',
  chat_id: 5,
  sender_id: 2,
  last_message: { id: 100, sender_id: 2, sender_name: 'bob', content: 'hi', type: 'message', timestamp: 't' },
  ...extra,
}) as WebSocketMessage;

describe('handleChatListWebSocketMessage', () => {
  it('refetches and notifies when a chat is deleted', () => {
    const { ctx, refetch, onChatDeleted } = setup();
    handleChatListWebSocketMessage({ type: 'chat_deleted', chat_id: 5 } as WebSocketMessage, ctx);
    expect(onChatDeleted).toHaveBeenCalledWith(5);
    expect(refetch).toHaveBeenCalled();
  });

  it('refetches when a group changes', () => {
    const { ctx, refetch } = setup();
    handleChatListWebSocketMessage({ type: 'group_updated' } as WebSocketMessage, ctx);
    expect(refetch).toHaveBeenCalled();
  });

  it('counts a message from someone else in a background chat as unread', () => {
    const { ctx, getState } = setup();
    handleChatListWebSocketMessage(incoming(), ctx);
    expect(getState()[5]).toMatchObject({ unread_count: 1, first_unread_message_id: 100 });
    expect(getState()[5].last_message?.id).toBe(100);
  });

  it('does not count own messages or messages in the open chat', () => {
    const own = setup();
    handleChatListWebSocketMessage(incoming({ sender_id: 1 }), own.ctx);
    expect(own.getState()[5].unread_count).toBe(0);

    const open = setup({ activeChatId: 5 });
    handleChatListWebSocketMessage(incoming(), open.ctx);
    expect(open.getState()[5].unread_count).toBe(0);
  });
});