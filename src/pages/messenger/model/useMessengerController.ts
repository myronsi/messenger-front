import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CurrentChat, directChatPath, dmPath, parseProfileUsername } from '@/app/routes/messengerRoutes';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { authFetch, clearAuthTokens } from '@/shared/auth/session';
import { useMessengerMobileNavigation } from './useMessengerMobileNavigation';
import { useMessengerRouteSync } from './useMessengerRouteSync';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const useMessengerController = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [chatSearchRequestKey, setChatSearchRequestKey] = useState(0);
  const [messageJumpRequest, setMessageJumpRequest] = useState<{ messageId: number; key: number } | null>(null);
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

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: number | null, avatarUrl?: string, pendingApprovalRequest?: boolean, pendingApprovalMessage?: string) => {
    prepareChatNavigation();
    if (type === 'one-on-one' || chatId > 0) {
      try {
        navigate(type === 'one-on-one' ? directChatPath(chatId, chatName, interlocutorDeleted) : `/chat/${chatId}`, { state: { chatName, chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId, chatId, pendingApprovalRequest, pendingApprovalMessage } });
      } catch (e) {
        // navigate may throw in some test environments; ignore
      }
    }
    setCurrentChat({ id: chatId, name: chatName, displayName: chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId, pendingApprovalRequest, pendingApprovalMessage });
    showMobileChatPanel();
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

  const jumpToCurrentChatMessage = (messageId: number) => {
    if (!currentChat || currentChat.id <= 0) return;
    setMessageJumpRequest({ messageId, key: Date.now() });
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

  useMessengerRouteSync({ currentChat, isUserProfileOpen, location, navigate, username, setCurrentChat, setIsUserProfileOpen, setProfileUsername, closeUserProfile });

  const handleChatDeleted = (chatId: number) => {
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!currentChat || currentChat.type !== 'one-on-one' || currentChat.id <= 0) return;

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
