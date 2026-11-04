import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CurrentChat, directChatPath, dmPath, parseDmIdentifier } from './messengerRoutes';
import { currentEntryMarks, useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { authFetch } from '@/shared/auth/session';
import { watchCurrentUser } from './watchCurrentUser';
import { watchSessionChanges } from './watchSessionChanges';
import { useMessengerMobileNavigation } from './useMessengerMobileNavigation';
import { useMessengerRouteSync } from './useMessengerRouteSync';
import { notificationReturnPath } from './resolveNotificationChat';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const useMessengerController = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const isMobile = useIsMobile();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const urlOverlay = useUrlOverlay();
  const { overlay, open: openOverlay, close: closeOverlay } = urlOverlay;
  const routeDirect = parseDmIdentifier(urlOverlay.base);
  const routeChatUsername = routeDirect?.type === 'username' ? routeDirect.value : currentChat?.type === 'one-on-one' ? currentChat.name : null;
  const isProfileOpen = overlay?.kind === 'settings';
  const profileUsername = overlay?.kind === 'user'
    ? overlay.username
    : overlay?.kind === 'profile' && routeDirect ? routeChatUsername : null;
  const isUserProfileOpen = !!profileUsername;
  const setIsProfileOpen = useCallback((open: boolean) => {
    const marks = currentEntryMarks();
    if (open) openOverlay({ kind: 'settings', page: 'profile' }, { settingsOpened: true, settingsDepth: 0, settingsChain: 0 });
    else if (isProfileOpen && marks.settingsOpened && marks.settingsChain && marks.settingsChain === marks.settingsDepth) navigate(-(marks.settingsChain + 1));
    else if (isProfileOpen) closeOverlay();
  }, [closeOverlay, isProfileOpen, navigate, openOverlay]);
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
  });

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    const stop = watchCurrentUser({
      fetchMe: () => authFetch(`${BASE_URL}/auth/me`),
      onUser: (user) => {
        setIsLoggedIn(true);
        setUsername(user.username);
        setIsLoading(false);
      },
      onSignedOut: () => {
        setIsLoggedIn(false);
        setUsername('');
        setIsLoading(false);
      },
    });
    return () => {
      stop();
      hasFetchedUser.current = false;
    };
  }, []);

  useEffect(() => watchSessionChanges({
    onSignedOut: () => {
      setCurrentChat(null);
      setIsLoggedIn(false);
      setUsername('');
      setIsLoading(false);
    },
    onAccountChanged: () => window.location.reload(),
  }), []);

  const handleLoginSuccess = (user: string) => {
    setCurrentChat(null);
    setIsLoggedIn(true);
    setUsername(user);
    setIsLoading(false);
    navigate(notificationReturnPath(location.pathname, location.search, location.state));
  };

  const openChat = (chatId: EntityId, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: EntityId | null, avatarUrl?: string, pendingApprovalRequest?: boolean, pendingApprovalMessage?: string) => {
    prepareChatNavigation();
    if (type === 'one-on-one' || isPersistedId(chatId)) {
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
    id: EntityId;
    name: string;
    display_name?: string;
    avatar_url: string;
    is_online?: boolean;
    last_seen?: string | null;
    interlocutor_deleted: boolean;
    type: 'one-on-one' | 'group';
    first_unread_message_id?: EntityId | null;
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
    const target = targetUsername.replace(/^@/, '');
    const isChatPartner = !!routeDirect && !!routeChatUsername && target.toLowerCase() === routeChatUsername.toLowerCase();
    openOverlay(isChatPartner ? { kind: 'profile' } : { kind: 'user', username: target });
  };

  const closeUserProfile = () => {
    if (overlay?.kind === 'user' || overlay?.kind === 'profile') closeOverlay();
  };

  const setIsUserProfileOpen = (open: boolean) => {
    if (!open) closeUserProfile();
    else if (routeChatUsername) openUserProfile(routeChatUsername);
  };

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

  const handleDirectChatCreated = (newId: EntityId, newName: string) => {
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

  useMessengerRouteSync({ currentChat, location, navigate, username, setCurrentChat });

  const handleChatDeleted = (chatId: EntityId) => {
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!currentChat || currentChat.type !== 'one-on-one' || !isPersistedId(currentChat.id)) return;

    try {
      const response = await authFetch(`${BASE_URL}/chats/delete/${currentChat.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await response.text());
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
    isLoading,
    isMobile,
    translations,
    handleLoginSuccess,
    openChat,
    updateActiveChatFromList,
    openUserProfile,
    closeUserProfile,
    openDirectChatFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleDeleteCurrentChat,
    mobileChatPanelClass,
  };
};
