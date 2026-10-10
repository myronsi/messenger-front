import { apiUrl } from '@/shared/api/apiUrl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CurrentChat, directChatPath, dmPath, parseProfileUsername } from './messengerRoutes';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { authFetch, dropInvalidSession } from '@/shared/auth/session';
import { useMessengerMobileNavigation } from './useMessengerMobileNavigation';
import { useMessengerRouteSync } from './useMessengerRouteSync';
import type { Id } from '@/shared/lib/ids';
import { isServerId } from '@/shared/lib/ids';


export const useMessengerController = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [chatSearchRequestKey, setChatSearchRequestKey] = useState(0);
  const [messageJumpRequest, setMessageJumpRequest] = useState<{ messageId: Id; key: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const isMobile = useIsMobile();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    backToChats,
    mobileChatPanelClass,
    prepareChatNavigation,
    showMobileChatPanel,
  } = useMessengerMobileNavigation({
    currentChat,
    isMobile,
    navigate,
    setCurrentChat,
    setIsUserProfileOpen,
    setProfileUsername,
  });

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    const loadCurrentUser = async () => {
      const fetchMe = async () => {
        const response = await authFetch(apiUrl('/me'));
        if (!response.ok) throw new Error('Invalid token');
        return response.json();
      };

      try {
        const user = await fetchMe();
        setIsLoggedIn(true);
        setUsername(user.username);
      } catch {
        dropInvalidSession();
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

  const openChat = (chatId: Id, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: Id | null, avatarUrl?: string, pendingApprovalRequest?: boolean, pendingApprovalMessage?: string) => {
    prepareChatNavigation();
    if (type === 'one-on-one' || isServerId(chatId)) {
      try {
        navigate(type === 'one-on-one' ? directChatPath(chatId, chatName, interlocutorDeleted) : `/chat/${chatId}`, { state: { chatName, chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId, chatId, pendingApprovalRequest, pendingApprovalMessage } });
      } catch (e) {
        // navigate may throw in some test environments; ignore
      }
    }
    setCurrentChat({
      id: chatId, name: chatName, displayName: chatDisplayName, isOnline, lastSeen, avatarUrl,
      interlocutorDeleted, type, firstUnreadMessageId, pendingApprovalRequest, pendingApprovalMessage,
    });
    showMobileChatPanel();
  };

  const updateActiveChatFromList = useCallback((chat: {
    id: Id;
    name: string;
    display_name?: string;
    avatar_url: string;
    is_online?: boolean;
    last_seen?: string | null;
    interlocutor_deleted: boolean;
    type: 'one-on-one' | 'group';
    first_unread_message_id?: Id | null;
  }) => {
    setCurrentChat((current) => {
      if (!current || current.id !== chat.id) return current;

      const nextFirstUnreadMessageId = Object.prototype.hasOwnProperty.call(chat, 'first_unread_message_id')
        ? chat.first_unread_message_id ?? null
        : current.firstUnreadMessageId;
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

  const jumpToCurrentChatMessage = (messageId: Id) => {
    if (!currentChat || !isServerId(currentChat.id)) return;
    setMessageJumpRequest({ messageId, key: Date.now() });
    closeUserProfile();
  };

  const canSearchCurrentDirectChat = () => (
    currentChat?.type === 'one-on-one' &&
    isServerId(currentChat.id) &&
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

  const handleDirectChatCreated = (newId: Id, newName: string) => {
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
      replace: !!currentChat && !isServerId(currentChat.id),
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

  useMessengerRouteSync({
    currentChat, isUserProfileOpen, location, navigate, username, setCurrentChat, setIsUserProfileOpen,
    setProfileUsername, closeUserProfile,
  });

  const handleChatDeleted = (chatId: Id) => {
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!currentChat || currentChat.type !== 'one-on-one' || !isServerId(currentChat.id)) return;

    try {
      const response = await authFetch(apiUrl(`/chats/${encodeURIComponent(currentChat.id)}`), {
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
    messageJumpRequest,
    isLoading,
    isMobile,
    translations,
    handleLoginSuccess,
    openChat,
    updateActiveChatFromList,
    openUserProfile,
    closeUserProfile,
    openCurrentChatSearch,
    jumpToCurrentChatMessage,
    canSearchCurrentDirectChat,
    openDirectChatFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleDeleteCurrentChat,
    mobileChatPanelClass,
  };
};
