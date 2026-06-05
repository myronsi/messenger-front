import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CurrentChat, directChatPath, dmPath, parseDmIdentifier, parseProfileUsername } from '@/app/routes/messengerRoutes';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { authFetch, clearAuthTokens } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const useMessengerController = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [chatSearchRequestKey, setChatSearchRequestKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileChatStage, setMobileChatStage] = useState<'closed' | 'open' | 'closing'>('closed');
  const hasFetchedUser = useRef(false);
  const mobileChatCloseTimerRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    const loadCurrentUser = async () => {
      const fetchMe = async () => {
        const response = await authFetch(`${BASE_URL}/auth/me`);
        if (!response.ok) throw new Error('Invalid token');
        return response.json();
      };

      try {
        const user = await fetchMe();
        setIsLoggedIn(true);
        setUsername(user.username);
      } catch {
        clearAuthTokens();
        setIsLoggedIn(false);
        setUsername('');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const handleLoginSuccess = (user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
    setIsLoading(false);
    navigate('/');
  };

  const clearMobileChatCloseTimer = useCallback(() => {
    if (mobileChatCloseTimerRef.current !== null) {
      window.clearTimeout(mobileChatCloseTimerRef.current);
      mobileChatCloseTimerRef.current = null;
    }
  }, []);

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: number | null, avatarUrl?: string) => {
    clearMobileChatCloseTimer();
    if (isMobile) {
      setMobileChatStage('closed');
    }
    if (type === 'one-on-one' || chatId > 0) {
      try {
        navigate(type === 'one-on-one' ? directChatPath(chatId, chatName, interlocutorDeleted) : `/chat/${chatId}`, { state: { chatName, chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId, chatId } });
      } catch (e) {
        // navigate may throw in some test environments; ignore
      }
    }
    setCurrentChat({ id: chatId, name: chatName, displayName: chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId });
    if (isMobile) {
      requestAnimationFrame(() => setMobileChatStage('open'));
    }
  };

  const updateActiveChatFromList = useCallback((chat: {
    id: number;
    name: string;
    display_name?: string;
    avatar_url: string;
    is_online?: boolean;
    last_seen?: string | null;
    interlocutor_deleted: boolean;
    type: 'one-on-one' | 'group';
    first_unread_message_id?: number | null;
  }) => {
    setCurrentChat((current) => {
      if (!current || current.id !== chat.id) return current;

      const nextFirstUnreadMessageId = chat.first_unread_message_id ?? current.firstUnreadMessageId;
      if (
        current.name === chat.name &&
        current.displayName === chat.display_name &&
        current.isOnline === chat.is_online &&
        current.lastSeen === (chat.last_seen ?? null) &&
        current.avatarUrl === chat.avatar_url &&
        current.interlocutorDeleted === chat.interlocutor_deleted &&
        current.type === chat.type &&
        current.firstUnreadMessageId === nextFirstUnreadMessageId
      ) {
        return current;
      }

      return {
        ...current,
        name: chat.name,
        displayName: chat.display_name,
        isOnline: chat.is_online,
        lastSeen: chat.last_seen ?? null,
        avatarUrl: chat.avatar_url,
        interlocutorDeleted: chat.interlocutor_deleted,
        type: chat.type,
        firstUnreadMessageId: nextFirstUnreadMessageId,
      };
    });
  }, []);

  const openUserProfile = (targetUsername: string) => {
    setProfileUsername(targetUsername);
    setIsUserProfileOpen(true);
  };

  const closeUserProfile = () => {
    setIsUserProfileOpen(false);
    setProfileUsername(null);
    if (parseProfileUsername(location.pathname) !== null) {
      navigate('/');
    }
  };

  const openCurrentChatSearch = () => {
    setChatSearchRequestKey((key) => key + 1);
    closeUserProfile();
  };

  const canSearchCurrentDirectChat = () => (
    currentChat?.type === 'one-on-one' &&
    currentChat.id > 0 &&
    (profileUsername || currentChat.name) === currentChat.name
  );

  const openDirectChatFromProfile = async (target: {
    username: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }) => {
    const targetUsername = target.username.trim();
    if (!targetUsername || targetUsername.toLowerCase() === username.toLowerCase()) {
      closeUserProfile();
      return;
    }

    closeUserProfile();
    navigate(dmPath(targetUsername), {
      state: {
        chatDisplayName: target.displayName || targetUsername,
        isOnline: target.isOnline,
        lastSeen: target.lastSeen ?? null,
      },
    });
  };

  const handleDirectChatCreated = (newId: number, newName: string) => {
    const nextChat = {
      id: newId,
      name: newName,
      displayName: currentChat?.displayName,
      isOnline: currentChat?.isOnline,
      lastSeen: currentChat?.lastSeen,
      avatarUrl: currentChat?.avatarUrl,
      interlocutorDeleted: false,
      type: 'one-on-one' as const,
      firstUnreadMessageId: null,
    };
    setCurrentChat(nextChat);
    navigate(directChatPath(newId, newName, nextChat.interlocutorDeleted), {
      replace: currentChat?.id === 0,
      state: {
        chatId: nextChat.id,
        chatName: nextChat.name,
        chatDisplayName: nextChat.displayName,
        isOnline: nextChat.isOnline,
        lastSeen: nextChat.lastSeen,
        avatarUrl: nextChat.avatarUrl,
        interlocutorDeleted: nextChat.interlocutorDeleted,
        type: nextChat.type,
        firstUnreadMessageId: nextChat.firstUnreadMessageId,
      },
    });
  };

  const finishBackToChats = useCallback(() => {
    clearMobileChatCloseTimer();
    setCurrentChat(null);
    setMobileChatStage('closed');
    setIsUserProfileOpen(false);
    setProfileUsername(null);
    try {
      navigate('/');
    } catch (e) {}
  }, [clearMobileChatCloseTimer, navigate]);

  const backToChats = useCallback(() => {
    if (isMobile && currentChat) {
      clearMobileChatCloseTimer();
      setMobileChatStage('closing');
      mobileChatCloseTimerRef.current = window.setTimeout(() => {
        finishBackToChats();
      }, 260);
      return;
    }

    finishBackToChats();
  }, [clearMobileChatCloseTimer, currentChat, finishBackToChats, isMobile]);

  useEffect(() => {
    if (!currentChat) {
      setMobileChatStage('closed');
    } else if (isMobile) {
      requestAnimationFrame(() => setMobileChatStage('open'));
    }
  }, [currentChat, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileChatStage('closed');
      clearMobileChatCloseTimer();
    }
  }, [clearMobileChatCloseTimer, isMobile]);

  useEffect(() => () => clearMobileChatCloseTimer(), [clearMobileChatCloseTimer]);

  useEffect(() => {
    const match = location.pathname.match(/^\/chat\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      if (id <= 0) {
        navigate('/');
        return;
      }
      if (currentChat && currentChat.id === id) return;

      const state: any = (location && (location as any).state) || {};
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
      const state: any = (location && (location as any).state) || {};
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
          .then(async (response) => {
            if (!response.ok) throw new Error(await response.text());
            return response.json();
          })
          .then((data) => {
            if (isCancelled) return;
            const chat = (data.chats || []).find((item: any) => item.id === targetChatId);
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
        .then((user) => {
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

  const handleChatDeleted = (chatId: number) => {
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!currentChat || currentChat.type !== 'one-on-one' || currentChat.id <= 0) return;
    if (!window.confirm(translations.deleteChatConfirm)) return;

    try {
      const response = await authFetch(`${BASE_URL}/chats/delete/${currentChat.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await response.text());
      setIsUserProfileOpen(false);
      setCurrentChat(null);
      navigate('/');
    } catch (err) {
      console.error('Error deleting chat from user profile:', err);
    }
  };

  const isMobileChatPanelOpen = currentChat && mobileChatStage === 'open';
  const mobileChatPanelClass = isMobileChatPanelOpen ? 'translate-x-0' : 'translate-x-full';

  return {
    isLoggedIn,
    setIsLoggedIn,
    username,
    currentChat,
    isProfileOpen,
    setIsProfileOpen,
    isUserProfileOpen,
    setIsUserProfileOpen,
    profileUsername,
    chatSearchRequestKey,
    isLoading,
    isMobile,
    translations,
    handleLoginSuccess,
    openChat,
    updateActiveChatFromList,
    openUserProfile,
    closeUserProfile,
    openCurrentChatSearch,
    canSearchCurrentDirectChat,
    openDirectChatFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleDeleteCurrentChat,
    mobileChatPanelClass,
  };
};
