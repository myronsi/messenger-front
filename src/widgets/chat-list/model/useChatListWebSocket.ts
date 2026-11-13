import { useChatCovered } from '@/shared/contexts/ChatCoveredContext';
import { realtime } from '@/shared/api/realtime';
import { endSession } from '@/shared/auth/session';
import { startNotifications, setNotificationLive } from '@/shared/lib/notifications/runtime';
import { notifyMessageFrame } from '@/shared/lib/notifications/frames';
import type { EntityId } from '@/shared/api/entityId';
import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { coalesceTask } from '@/shared/lib/coalesceTask';
import { applyTypingFrame, clearTypingUsers } from '@/entities/typing';
import { chatApi } from '@/entities/chat';
import { useAppDispatch } from '@/shared/hooks/redux';
import type { ChatOverrideMap, ChatListModal, ChatsListComponentProps, PresenceMap } from './types';

const CHAT_LIST_REFETCH_DELAY_MS = 750;
const GO_CHAT_LIST_EVENTS = ['message', 'read', 'edit', 'delete', 'chat_list_update', 'chat_created', 'chat_deleted', 'group_created', 'group_updated', 'presence', 'history_cleared'];

interface UseChatListWebSocketParams {
  token: string | null | undefined;
  username: string;
  activeChatId?: EntityId;
  activeChatName?: string;
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onChatDeleted?: (chatId: EntityId) => void;
  currentUserId?: EntityId;
  refetch: () => unknown;
  refetchRequestInbox: () => void;
  chatsByIdRef: React.MutableRefObject<Record<EntityId, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
  setModal: (modal: ChatListModal | null) => void;
}

// Owns the chat-list WebSocket connection lifecycle (connect on sign-in, reconnect with backoff,
// teardown on unmount) and forwards parsed messages to the pure message-handling function.
// The socket authenticates with a one-time ticket, so a token refresh does not need a new connection.
export function useChatListWebSocket(params: UseChatListWebSocketParams) {
  const { token, username, activeChatId, onChatDeleted, currentUserId, refetch, refetchRequestInbox } = params;
  const dispatch = useAppDispatch();
  const usernameRef = useRef(username);
  const activeChatIdRef = useRef(activeChatId);
  const onChatDeletedRef = useRef(onChatDeleted);
  const refetchRef = useRef(refetch);
  const refetchRequestInboxRef = useRef(refetchRequestInbox);
  const isSignedIn = Boolean(token);
  useEffect(() => {
    if (isSignedIn && currentUserId) return startNotifications(String(currentUserId));
  }, [isSignedIn, currentUserId]);

  const chatCovered = useChatCovered();
  useEffect(() => { activeChatIdRef.current = chatCovered ? undefined : activeChatId; }, [activeChatId, chatCovered]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { onChatDeletedRef.current = onChatDeleted; }, [onChatDeleted]);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);
  useEffect(() => { refetchRequestInboxRef.current = refetchRequestInbox; }, [refetchRequestInbox]);

  useEffect(() => {
    if (!isSignedIn) return;
    const listRefetch = coalesceTask(() => refetchRef.current(), CHAT_LIST_REFETCH_DELAY_MS);
    const pending = () => dispatch((_, getState) => {
      const state = getState();
      const user = usernameRef.current;
      return {
        list: [chatApi.endpoints.getOneOnOneChats.select(user)(state), chatApi.endpoints.getGroupChats.select(user)(state)]
          .some(entry => entry.status === 'pending'),
        requests: chatApi.endpoints.getApprovalRequestInbox.select()(state).status === 'pending',
      };
    });
    const release = realtime.subscribe({
      onOpen: ({ reconnected }) => {
        setNotificationLive(true);
        const inFlight = reconnected ? { list: false, requests: false } : pending();
        if (!inFlight.list) refetchRef.current();
        if (!inFlight.requests) refetchRequestInboxRef.current();
      },
      onStatus: status => { if (status !== 'connected') { setNotificationLive(false); clearTypingUsers(); } },
      onEvent: frame => {
        if (frame.type === 'security_notice' && frame.data.type === 'password_reset') {
          sessionStorage.setItem('security_notice', 'Your password was reset using account recovery. Please sign in again.');
          endSession(); window.location.assign('/login'); return;
        }
        applyTypingFrame(frame);
        notifyMessageFrame(frame, activeChatIdRef.current);
        if (GO_CHAT_LIST_EVENTS.includes(frame.type)) listRefetch.schedule();
        if (frame.type === 'approval_request_created') refetchRequestInboxRef.current();
        if (frame.type === 'chat_deleted' && frame.chat_id) onChatDeletedRef.current?.(frame.chat_id);
      },
    });
    return () => { release(); listRefetch.cancel(); setNotificationLive(false); clearTypingUsers(); };
  }, [dispatch, isSignedIn]);
}
