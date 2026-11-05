import { getApiBaseUrl } from '@/shared/api/config';
import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useLocation, type NavigateFunction } from 'react-router-dom';
import { CurrentChat, directChatPath, parseDmIdentifier } from './messengerRoutes';
import { joinOverlayPath, splitOverlayPath } from '@/shared/lib/urlOverlay';
import { authFetch } from '@/shared/auth/session';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { resolveNotificationChat } from './resolveNotificationChat';
import { focusComposerWhenReady } from '@/shared/lib/notifications/replyFocus';

const BASE_URL = getApiBaseUrl();

interface MessengerRouteState {
  chatId?: EntityId;
  chatName?: string;
  chatDisplayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string;
  interlocutorDeleted?: boolean;
  type?: 'one-on-one' | 'group';
  firstUnreadMessageId?: EntityId | null;
  pendingApprovalRequest?: boolean;
  pendingApprovalMessage?: string;
}

interface DirectChatSummary {
  id: EntityId;
  interlocutor_name: string;
  interlocutor_display_name?: string;
  interlocutor_is_online?: boolean;
  interlocutor_last_seen?: string | null;
  avatar_url?: string;
  interlocutor_deleted: boolean;
  first_unread_message_id?: EntityId | null;
}

interface DirectUserProfile {
  direct_chat_id?: EntityId;
  username?: string;
  display_name?: string;
  is_online?: boolean;
  last_seen?: string | null;
  avatar_url?: string;
  can_message?: boolean;
  direct_message_reason?: CurrentChat['directDraftReason'];
}

interface DirectChatListResponse {
  chats?: DirectChatSummary[];
}

interface MessengerRouteSyncOptions {
  currentChat: CurrentChat | null;
  location: ReturnType<typeof useLocation>;
  navigate: NavigateFunction;
  username: string;
  setCurrentChat: Dispatch<SetStateAction<CurrentChat | null>>;
}

export const useMessengerRouteSync = ({
  currentChat,
  location,
  navigate,
  username,
  setCurrentChat,
}: MessengerRouteSyncOptions) => {
  const routeBase = splitOverlayPath(location.pathname).base;
  const pathnameRef = useLatestRef(location.pathname);
  useEffect(() => {
    const withOverlay = (path: string) => joinOverlayPath(path, splitOverlayPath(pathnameRef.current).overlay);
    const match = routeBase.match(/^\/chat\/(\d+)$/);
    if (match) {
      const id = match[1];
      if (!isPersistedId(id)) {
        navigate('/');
        return;
      }
      if (location.search === '?notification=1' || location.search === '?notification=1&reply=1') {
        if (!username) return;
        let cancelled = false;
        const reply = location.search.endsWith('&reply=1');
        void resolveNotificationChat(id).then((state) => {
          if (cancelled) return;
          navigate(withOverlay(`/chat/${id}`), { replace: true, state });
          if (reply) focusComposerWhenReady(id);
        }).catch(() => { if (!cancelled) navigate('/', { replace: true }); });
        return () => { cancelled = true; };
      }
      if (currentChat && String(currentChat.id) === id) return;

      const state = (location.state as MessengerRouteState | null) ?? {};
      const name = state.chatName || String(id);
      const displayName = state.chatDisplayName;
      const isOnline = state.isOnline;
      const lastSeen = state.lastSeen;
      const avatarUrl = state.avatarUrl;
      const interlocutorDeleted = !!state.interlocutorDeleted;
      const type = state.type || 'one-on-one';
      const firstUnreadMessageId = state.firstUnreadMessageId ?? null;
      if (type === 'one-on-one' && state.chatName) {
        navigate(withOverlay(directChatPath(id, state.chatName, interlocutorDeleted)), {
          replace: true,
          state: { ...state, chatId: id },
        });
        return;
      }
      setCurrentChat({ id, name, displayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId });
      return;
    }

    const directIdentifier = parseDmIdentifier(routeBase);
    if (directIdentifier !== null) {
      if (!username) return;

      let isCancelled = false;
      const state = (location.state as MessengerRouteState | null) ?? {};
      if (state.chatName || state.chatDisplayName || state.chatId) {
        setCurrentChat({
          id: state.chatId || 0,
          name: state.chatName || String(directIdentifier.value),
          displayName: state.chatDisplayName || state.chatName || String(directIdentifier.value),
          isOnline: state.isOnline,
          lastSeen: state.lastSeen ?? null,
          avatarUrl: state.avatarUrl,
          interlocutorDeleted: !!state.interlocutorDeleted,
          type: 'one-on-one',
          firstUnreadMessageId: state.firstUnreadMessageId ?? null,
        });
      } else {
        setCurrentChat(null);
      }

      if (directIdentifier.type === 'chatId') {
        const targetChatId = directIdentifier.value;
        if (!targetChatId) {
          navigate('/', { replace: true });
          return;
        }

        authFetch(`${BASE_URL}/chats/list/${encodeURIComponent(username)}`)
          .then(async (response): Promise<DirectChatListResponse> => {
            if (!response.ok) throw new Error(await response.text());
            return response.json();
          })
          .then((data) => {
            if (isCancelled) return;
            const chat = (data.chats || []).find((item) => String(item.id) === targetChatId);
            if (!chat) {
              navigate('/', { replace: true });
              return;
            }
            const canonicalPath = directChatPath(chat.id, chat.interlocutor_name, chat.interlocutor_deleted);
            if (routeBase !== canonicalPath) {
              navigate(withOverlay(canonicalPath), {
                replace: true,
                state: {
                  chatId: chat.id,
                  chatName: chat.interlocutor_name,
                  chatDisplayName: chat.interlocutor_display_name,
                  isOnline: chat.interlocutor_is_online,
                  lastSeen: chat.interlocutor_last_seen,
                  avatarUrl: chat.avatar_url,
                  interlocutorDeleted: chat.interlocutor_deleted,
                  type: 'one-on-one',
                  firstUnreadMessageId: chat.first_unread_message_id ?? null,
                },
              });
            }
            setCurrentChat({
              id: chat.id,
              name: chat.interlocutor_name,
              displayName: chat.interlocutor_display_name,
              isOnline: chat.interlocutor_is_online,
              lastSeen: chat.interlocutor_last_seen ?? null,
              avatarUrl: chat.avatar_url,
              interlocutorDeleted: chat.interlocutor_deleted,
              type: 'one-on-one',
              firstUnreadMessageId: chat.first_unread_message_id ?? null,
            });
          })
          .catch((error) => {
            if (isCancelled) return;
            console.error('Error loading direct chat by id:', error);
            setCurrentChat(null);
          });

        return () => {
          isCancelled = true;
        };
      }

      const targetUsername = directIdentifier.value;
      if (!targetUsername || targetUsername.toLowerCase() === username.toLowerCase()) {
        navigate('/', { replace: true });
        return;
      }

      authFetch(`${BASE_URL}/users/users/${encodeURIComponent(targetUsername)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text());
          return response.json();
        })
        .then((user: DirectUserProfile) => {
          if (isCancelled) return;
          const canonicalPath = directChatPath(user.direct_chat_id || state.chatId || 0, user.username || targetUsername, false);
          if (routeBase !== canonicalPath) {
            navigate(withOverlay(canonicalPath), {
              replace: true,
              state: {
                ...state,
                chatId: user.direct_chat_id || state.chatId,
                chatName: user.username || targetUsername,
                chatDisplayName: user.display_name || state.chatDisplayName || targetUsername,
                isOnline: user.is_online ?? state.isOnline,
                lastSeen: user.last_seen ?? state.lastSeen ?? null,
                avatarUrl: user.avatar_url ?? state.avatarUrl,
              },
            });
          }

          setCurrentChat({
            id: user.direct_chat_id || state.chatId || 0,
            name: user.username || targetUsername,
            displayName: user.display_name || state.chatDisplayName || targetUsername,
            isOnline: user.is_online ?? state.isOnline,
            lastSeen: user.last_seen ?? state.lastSeen ?? null,
            avatarUrl: user.avatar_url ?? state.avatarUrl,
            interlocutorDeleted: false,
            type: 'one-on-one',
            firstUnreadMessageId: null,
            directDraftDisabled: !user.can_message,
            directDraftReason: user.direct_message_reason ?? null,
            pendingApprovalRequest: !!state.pendingApprovalRequest,
            pendingApprovalMessage: state.pendingApprovalMessage,
          });
        })
        .catch((error) => {
          if (isCancelled) return;
          console.error('Error loading direct chat draft:', error);
          setCurrentChat(null);
        });

      return () => {
        isCancelled = true;
      };
    }

    if (currentChat) setCurrentChat(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeBase, location.search, username, pathnameRef]);
};
