import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useLocation, type NavigateFunction } from 'react-router-dom';
import { CurrentChat, directChatPath, parseDmIdentifier, parseProfileUsername } from './messengerRoutes';
import { authFetch } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface MessengerRouteState {
  chatId?: number;
  chatName?: string;
  chatDisplayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string;
  interlocutorDeleted?: boolean;
  type?: 'one-on-one' | 'group';
  firstUnreadMessageId?: number | null;
  pendingApprovalRequest?: boolean;
  pendingApprovalMessage?: string;
}

interface DirectChatSummary {
  id: number;
  interlocutor_name: string;
  interlocutor_display_name?: string;
  interlocutor_is_online?: boolean;
  interlocutor_last_seen?: string | null;
  avatar_url?: string;
  interlocutor_deleted: boolean;
  first_unread_message_id?: number | null;
}

interface DirectUserProfile {
  direct_chat_id?: number;
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
  isUserProfileOpen: boolean;
  location: ReturnType<typeof useLocation>;
  navigate: NavigateFunction;
  username: string;
  setCurrentChat: Dispatch<SetStateAction<CurrentChat | null>>;
  setIsUserProfileOpen: Dispatch<SetStateAction<boolean>>;
  setProfileUsername: Dispatch<SetStateAction<string | null>>;
  closeUserProfile: () => void;
}

export const useMessengerRouteSync = ({
  currentChat,
  isUserProfileOpen,
  location,
  navigate,
  username,
  setCurrentChat,
  setIsUserProfileOpen,
  setProfileUsername,
  closeUserProfile,
}: MessengerRouteSyncOptions) => {
  useEffect(() => {
    const match = location.pathname.match(/^\/chat\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      if (id <= 0) {
        navigate('/');
        return;
      }
      if (currentChat && currentChat.id === id) return;

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
        navigate(directChatPath(id, state.chatName, interlocutorDeleted), {
          replace: true,
          state: { ...state, chatId: id },
        });
        return;
      }
      setCurrentChat({ id, name, displayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId });
      return;
    }

    const directIdentifier = parseDmIdentifier(location.pathname);
    if (directIdentifier !== null) {
      if (!username) return;

      let isCancelled = false;
      const state = (location.state as MessengerRouteState | null) ?? {};
      if (state.chatName || state.chatDisplayName || state.chatId) {
        setCurrentChat({
          id: state.chatId || 0,
          name: state.chatName || directIdentifier.value,
          displayName: state.chatDisplayName || state.chatName || directIdentifier.value,
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
            const chat = (data.chats || []).find((item) => item.id === targetChatId);
            if (!chat) {
              navigate('/', { replace: true });
              return;
            }
            const canonicalPath = directChatPath(chat.id, chat.interlocutor_name, chat.interlocutor_deleted);
            if (location.pathname !== canonicalPath) {
              navigate(canonicalPath, {
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
          if (location.pathname !== canonicalPath) {
            navigate(canonicalPath, {
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

    const profileRouteUsername = parseProfileUsername(location.pathname);
    if (profileRouteUsername !== null) {
      if (!username) return;
      if (!profileRouteUsername) {
        navigate('/', { replace: true });
        return;
      }
      setCurrentChat(null);
      setProfileUsername(profileRouteUsername);
      setIsUserProfileOpen(true);
      return;
    } else {
      if (currentChat) setCurrentChat(null);
      if (isUserProfileOpen) closeUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, username]);
};
