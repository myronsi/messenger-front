import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Menu, Loader2, Search, X, Check, CheckCheck, Pin, PinOff } from 'lucide-react';
import { Chat, ChatLastMessage } from '@/entities/message';
import UserProfileComponentRTK from '@/features/profiles/UserProfileComponentRTK';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { useGetOneOnOneChatsQuery, useGetGroupChatsQuery, useCreateChatMutation, useGetCurrentUserQuery, useSetChatPinnedMutation } from '@/app/api/messengerApi';
import SearchUsers from './SearchUsers';
import ChatsListHeader from './ChatsListHeader';
import { formatTime, parseUtcDate } from '@/shared/utils/dateFormatters';
import { clearAuthTokens, ensureAccessToken, useAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

interface ChatsListComponentProps {
  username: string;
  onChatOpen: (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: number | null, avatarUrl?: string) => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: number;
  onActiveChatUpdate?: (chat: Chat) => void;
  onChatDeleted?: (chatId: number) => void;
}

// WebSocket message interface
interface WebSocketMessage {
  type: 'chat_created' | 'chat_deleted' | 'group_created' | 'group_updated' | 'presence_update' | 'chat_list_message' | 'chat_list_read' | 'error';
  message?: string;
  username?: string;
  user_id?: number;
  is_online?: boolean;
  last_seen?: string | null;
  chat?: {
    chat_id: number;
    name: string;
    user1: string;
    user2: string;
    user1_avatar_url?: string;
    user2_avatar_url?: string;
  };
  group?: {
    chat_id: number;
    name: string;
    participants: string[];
  };
  chat_id?: number;
  sender_id?: number;
  reader_user_id?: number;
  message_id?: number;
  last_message?: ChatLastMessage | null;
  timestamp?: string;
}

const ChatsListComponentRTK: React.FC<ChatsListComponentProps> = ({
  username,
  onChatOpen,
  setIsProfileOpen,
  activeChatId,
  onActiveChatUpdate,
  onChatDeleted,
}) => {
  // RTK Query hooks
  const { 
    data: oneOnOneChatsData, 
    error: oneOnOneError, 
    isLoading: isLoadingOneOnOne, 
    refetch: refetchOneOnOne 
  } = useGetOneOnOneChatsQuery(username);
  
  const { 
    data: groupChatsData, 
    error: groupError, 
    isLoading: isLoadingGroups, 
    refetch: refetchGroups 
  } = useGetGroupChatsQuery(username);
  
  const [createChat, { isLoading: isCreatingChat }] = useCreateChatMutation();
  const [setChatPinned] = useSetChatPinnedMutation();
  const { data: currentUserData } = useGetCurrentUserQuery();

  // Combine loading states and errors
  const isLoading = isLoadingOneOnOne || isLoadingGroups;
  const error = oneOnOneError || groupError;
  
  // Use useCallback to stabilize the refetch function reference
  const refetch = useCallback(() => {
    refetchOneOnOne();
    refetchGroups();
  }, [refetchOneOnOne, refetchGroups]);

  // Local state
  const [targetUser, setTargetUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  // animation / reveal state
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [circleActive, setCircleActive] = useState(false);
  const [circleStyle, setCircleStyle] = useState<{ left: number; top: number; size: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [modal, setModal] = useState<{
    type: 'error' | 'success' | 'validation' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [presenceByUsername, setPresenceByUsername] = useState<Record<string, { is_online: boolean; last_seen: string | null }>>({});
  const [chatOverrides, setChatOverrides] = useState<Record<number, Partial<Pick<Chat, 'last_message' | 'unread_count' | 'first_unread_message_id' | 'is_pinned'>>>>({});
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number; y: number; chatId: number; isPinned: boolean } | null>(null);
  
  const token = useAccessToken();
  const wsRef = useRef<WebSocket | null>(null);
  const chatsByIdRef = useRef<Record<number, Chat>>({});
  const activeChatIdRef = useRef(activeChatId);
  const currentUserIdRef = useRef<number | undefined>(currentUserData?.id);
  const onChatDeletedRef = useRef(onChatDeleted);
  const refetchRef = useRef(refetch);
  const { translations, language } = useLanguage();

  // search logic moved to SearchUsers component

  // Transform the API data to match your existing Chat interface with proper avatar URLs
  const chats: Chat[] = React.useMemo(() => {
    const withOverrides = (chat: Chat): Chat => ({
      ...chat,
      ...(chatOverrides[chat.id] || {}),
    });

    const oneOnOneChats: Chat[] = (oneOnOneChatsData?.chats || []).map((chat) => withOverrides({
      ...(presenceByUsername[chat.interlocutor_name] || {}),
      id: chat.id,
      name: chat.interlocutor_name,
      interlocutor_name: chat.interlocutor_name,
      display_name: chat.interlocutor_display_name || chat.interlocutor_name,
      avatar_url: chat.avatar_url ? `${BASE_URL}${chat.avatar_url}` : DEFAULT_AVATAR,
      is_online: presenceByUsername[chat.interlocutor_name]?.is_online ?? chat.interlocutor_is_online ?? false,
      last_seen: presenceByUsername[chat.interlocutor_name]?.last_seen ?? chat.interlocutor_last_seen ?? null,
      interlocutor_deleted: chat.interlocutor_deleted || false,
      type: 'one-on-one' as const,
      last_message: chat.last_message || null,
      unread_count: chat.unread_count || 0,
      first_unread_message_id: chat.first_unread_message_id || null,
      is_pinned: !!chat.is_pinned,
    }));

    const groupChats: Chat[] = (groupChatsData?.groups || []).map((group) => withOverrides({
      id: group.chat_id,
      name: group.name,
      interlocutor_name: group.name,
      display_name: group.name,
      avatar_url: group.avatar_url ? `${BASE_URL}${group.avatar_url}` : DEFAULT_GROUP_AVATAR,
      is_online: false,
      last_seen: null,
      interlocutor_deleted: false,
      type: 'group' as const,
      last_message: group.last_message || null,
      unread_count: group.unread_count || 0,
      first_unread_message_id: group.first_unread_message_id || null,
      is_pinned: !!group.is_pinned,
    }));

    return [...oneOnOneChats, ...groupChats]
      .map((chat, index) => ({ chat, index }))
      .sort((a, b) => {
        const aPinned = !!a.chat.is_pinned;
        const bPinned = !!b.chat.is_pinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const aTime = a.chat.last_message?.timestamp ? parseUtcDate(a.chat.last_message.timestamp).getTime() : 0;
        const bTime = b.chat.last_message?.timestamp ? parseUtcDate(b.chat.last_message.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.index - b.index;
      })
      .map(({ chat }) => chat);
  }, [oneOnOneChatsData, groupChatsData, presenceByUsername, chatOverrides]);

  useEffect(() => {
    chatsByIdRef.current = chats.reduce<Record<number, Chat>>((acc, chat) => {
      acc[chat.id] = chat;
      return acc;
    }, {});
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserData?.id;
  }, [currentUserData?.id]);

  useEffect(() => {
    onChatDeletedRef.current = onChatDeleted;
  }, [onChatDeleted]);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!chatContextMenu) return;

    const closeMenu = () => setChatContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatContextMenu]);

  useEffect(() => {
    if (!activeChatId || !onActiveChatUpdate) return;
    const activeChat = chats.find((chat) => chat.id === activeChatId);
    if (activeChat) onActiveChatUpdate(activeChat);
  }, [activeChatId, chats, onActiveChatUpdate]);

  const getLastMessagePreview = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage) return translations.noMessagesYet;
    if (lastMessage.type === 'file' && typeof lastMessage.content !== 'string') {
      const fileType = lastMessage.content.file_type;
      const fileName = lastMessage.content.file_name || '';
      if (fileType === 'voice' || /\.opus$/i.test(fileName)) return translations.voiceMessagePreview;
      if (fileType === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) return translations.photoMessage;
      return translations.fileMessagePreview;
    }
    return typeof lastMessage.content === 'string' ? lastMessage.content : translations.fileMessagePreview;
  };

  const getLastMessageTime = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage?.timestamp) return '';
    const messageDate = parseUtcDate(lastMessage.timestamp);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const messageDayStart = new Date(messageDate);
    messageDayStart.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((todayStart.getTime() - messageDayStart.getTime()) / (24 * 60 * 60 * 1000));
    const locale = language === 'ru' ? 'ru-RU' : 'en-GB';

    if (dayDiff <= 0) {
      return formatTime(lastMessage.timestamp, language);
    }

    if (dayDiff === 1) {
      return translations.yesterday || (language === 'ru' ? 'Вчера' : 'Yesterday');
    }

    if (dayDiff < 7) {
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(messageDate).toLowerCase();
    }

    if (messageDate.getFullYear() === todayStart.getFullYear()) {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(messageDate);
    }

    const day = String(messageDate.getDate()).padStart(2, '0');
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${messageDate.getFullYear()}`;
  };

  const isOwnLastMessage = (lastMessage?: ChatLastMessage | null) => {
    return !!currentUserData?.id && lastMessage?.sender_id === currentUserData.id;
  };

  const isOwnLastMessageRead = (lastMessage?: ChatLastMessage | null) => {
    if (!currentUserData?.id || !lastMessage?.read_by) return false;
    return lastMessage.read_by.some((read) => read.user_id !== currentUserData.id);
  };

  // Handle RTK Query errors
  useEffect(() => {
    if (error) {
      let errorMessage = 'Failed to load chats';
      
      if ('data' in error && error.data) {
        errorMessage = (error.data as any).detail || 'Failed to load chats';
      } else if ('message' in error && error.message) {
        errorMessage = error.message;
      }
        
      setModal({
        type: 'error',
        message: errorMessage.includes('401') ? translations.loginRequired : translations.errorLoading,
        onConfirm: errorMessage.includes('401') ? () => {
          clearAuthTokens();
          window.location.href = '/';
        } : undefined,
      });
    }
  }, [error, translations]);

  // WebSocket setup (keeping your existing WebSocket logic)
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      if (!isMounted) return;
      
      // Check if WebSocket is already connected or connecting
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting for chat list');
        return;
      }

      console.log('Connecting WebSocket for chat list');
      try {
        const wsToken = await ensureAccessToken();
        if (!isMounted || !wsToken) return;
        wsRef.current = new WebSocket(`${WS_URL}/ws/chat/0?token=${wsToken}`);
      } catch (e) {
        console.error('Failed to create WebSocket for chat list', e);
        return;
      }

      wsRef.current.onopen = () => {
        if (!isMounted) return;
        console.log('WebSocket successfully connected for chat list');
      };

      wsRef.current.onmessage = (event) => {
        if (!isMounted) return;
        let parsedData: WebSocketMessage;
        try {
          parsedData = JSON.parse(event.data);
        } catch (error) {
          console.error('Received non-JSON message:', event.data);
          return;
        }

        console.log('WebSocket message received:', parsedData);

        switch (parsedData.type) {
          case 'chat_created':
          case 'group_created':
          case 'group_updated':
            // Refetch chats when a new chat is created
            refetchRef.current();
            break;
          case 'chat_deleted':
            if (parsedData.chat_id && onChatDeletedRef.current) {
              onChatDeletedRef.current(parsedData.chat_id);
            }
            // Refetch chats when a chat is deleted
            refetchRef.current();
            break;
          case 'chat_list_message':
            if (parsedData.chat_id && parsedData.last_message) {
              setChatOverrides((prev) => {
                const chatId = parsedData.chat_id as number;
                const existing = prev[chatId] || {};
                const baseChat = chatsByIdRef.current[chatId];
                const existingUnreadCount = existing.unread_count ?? baseChat?.unread_count ?? 0;
                const existingFirstUnreadId = existing.first_unread_message_id ?? baseChat?.first_unread_message_id ?? null;
                const isOwnMessage = parsedData.sender_id === currentUserIdRef.current;
                const shouldCountUnread = !isOwnMessage && parsedData.chat_id !== activeChatIdRef.current;
                const nextUnreadCount = shouldCountUnread ? existingUnreadCount + 1 : existingUnreadCount;
                return {
                  ...prev,
                  [chatId]: {
                    ...existing,
                    last_message: parsedData.last_message || null,
                    unread_count: isOwnMessage || parsedData.chat_id === activeChatIdRef.current ? existingUnreadCount : nextUnreadCount,
                    first_unread_message_id: shouldCountUnread
                      ? existingFirstUnreadId || parsedData.last_message?.id || null
                      : existingFirstUnreadId,
                  },
                };
              });
            }
            break;
          case 'chat_list_read':
            if (parsedData.chat_id) {
              setChatOverrides((prev) => {
                const chatId = parsedData.chat_id as number;
                const existing = prev[chatId] || {};
                const baseChat = chatsByIdRef.current[chatId];
                const lastMessage = existing.last_message ?? baseChat?.last_message ?? null;
                const nextLastMessage = lastMessage?.id === parsedData.message_id && parsedData.reader_user_id
                  ? {
                      ...lastMessage,
                      read_by: [
                        ...(lastMessage.read_by || []).filter((read) => read.user_id !== parsedData.reader_user_id),
                        { user_id: parsedData.reader_user_id, read_at: parsedData.timestamp || new Date().toISOString() },
                      ],
                    }
                  : lastMessage;

                return {
                  ...prev,
                  [chatId]: {
                    ...existing,
                    last_message: nextLastMessage,
                    unread_count: parsedData.reader_user_id === currentUserIdRef.current ? 0 : existing.unread_count ?? baseChat?.unread_count ?? 0,
                    first_unread_message_id: parsedData.reader_user_id === currentUserIdRef.current ? null : existing.first_unread_message_id ?? baseChat?.first_unread_message_id ?? null,
                  },
                };
              });
            }
            break;
          case 'presence_update':
            if (parsedData.username) {
              setPresenceByUsername((prev) => ({
                ...prev,
                [parsedData.username as string]: {
                  is_online: !!parsedData.is_online,
                  last_seen: parsedData.last_seen || null,
                },
              }));
            }
            break;
          case 'error':
            setModal({
              type: 'error',
              message: parsedData.message || 'Unknown error',
            });
            break;
        }
      };

      wsRef.current.onclose = (event) => {
        if (!isMounted) return;
        console.log('WebSocket disconnected for chat list');
        // Only reconnect if it wasn't a clean close and component is still mounted
        if (event.code !== 1000 && event.code !== 1001 && token) {
          reconnectTimeoutId = setTimeout(() => {
            if (isMounted && token) connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        if (!isMounted) return;
        console.error('WebSocket error for chat list:', error);
        // Don't show modal for transient errors - let reconnection logic handle it
      };
    };

    if (token) {
      connectWebSocket();
    }

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounted');
        } catch (e) {
          console.warn('Error while closing chat list WebSocket', e);
        }
        wsRef.current = null;
      }
    };
  }, [token]);

  const ANIM_DURATION = 120; // ms

  const handleOpenSearch = (btnRect: DOMRect) => {
    // compute the circle center relative to container
    const container = containerRef.current;
    if (!container) {
      // fallback: simple show
      setOverlayVisible(true);
      setShowSearch(true);
      setTimeout(() => {
        // focus first input inside overlay after it's visible
        const input = document.querySelector('#search-overlay input, #search-overlay textarea') as HTMLInputElement | null;
        input?.focus();
      }, 100);
      return;
    }

    const contRect = container.getBoundingClientRect();

    // compute button center relative to container
    const centerX = (btnRect.left + btnRect.right) / 2 - contRect.left;
    const centerY = (btnRect.top + btnRect.bottom) / 2 - contRect.top;

    // compute max distance to container corners
    const distances = [
      Math.hypot(centerX - 0, centerY - 0),
      Math.hypot(centerX - contRect.width, centerY - 0),
      Math.hypot(centerX - 0, centerY - contRect.height),
      Math.hypot(centerX - contRect.width, centerY - contRect.height),
    ];
    const R = Math.ceil(Math.max(...distances));
    const size = R * 2;

    setCircleStyle({ left: Math.round(centerX - R), top: Math.round(centerY - R), size });
    // show the overlay container and animate the circle
    setOverlayVisible(true);
    // small delay to ensure DOM paint
    requestAnimationFrame(() => {
      setCircleActive(true);
    });

    // after animation end, reveal inner content and focus input
    setTimeout(() => {
      setShowSearch(true);
      const input = document.querySelector('#search-overlay input, #search-overlay textarea') as HTMLInputElement | null;
      input?.focus();
    }, ANIM_DURATION - 50);
  };

  const handleCloseSearch = () => {
    // reverse animation
    setShowSearch(false);
    setCircleActive(false);
    // after animation finished, hide overlay
    setTimeout(() => {
      setOverlayVisible(false);
      setCircleStyle(null);
    }, ANIM_DURATION + 20);
  };

  const handleCreateChat = async () => {
    if (!targetUser.trim()) {
      setModal({
        type: 'validation',
        message: translations.enterUsername || 'Please enter a username',
      });
      return;
    }

    try {
      // You'll need to modify this based on your API
      // This assumes you have a user lookup endpoint
      const result = await createChat({
        user1: username,
        user2: targetUser.trim(),
      }).unwrap();

      setTargetUser('');
      setModal({
        type: 'success',
        message: translations.chatCreated || 'Chat created successfully',
      });
      
      // The refetch will be triggered by WebSocket, but you can also manually refetch
      refetch();
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || 'Failed to create chat',
      });
    }
  };

  // Create chat directly with a selected username (used by suggestion click)
  const handleCreateChatWith = async (usernameTo: string) => {
    try {
      const result = await createChat({ user1: username, user2: usernameTo }).unwrap();
      setTargetUser('');
      setModal({ type: 'success', message: translations.chatCreated || 'Chat created successfully' });
      refetch();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to create chat' });
    }
  };

  const handleChatClick = (chat: Chat) => {
    // Don't re-open if this chat is already active
    if (chat.id === activeChatId) {
      return;
    }
    setChatOverrides((prev) => ({
      ...prev,
      [chat.id]: {
        ...(prev[chat.id] || {}),
        unread_count: 0,
        first_unread_message_id: null,
      },
    }));
    onChatOpen(
      chat.id,
      chat.name,
      chat.interlocutor_deleted,
      chat.type,
      chat.display_name,
      chat.is_online,
      chat.last_seen,
      chat.first_unread_message_id,
      chat.avatar_url
    );
  };

  const handleChatContextMenu = (event: React.MouseEvent, chat: Chat) => {
    event.preventDefault();
    event.stopPropagation();
    setChatContextMenu({
      x: event.clientX,
      y: event.clientY,
      chatId: chat.id,
      isPinned: !!chat.is_pinned,
    });
  };

  const handleTogglePinnedChat = async (chatId: number) => {
    const chat = chatsByIdRef.current[chatId];
    const nextPinned = !chat?.is_pinned;
    setChatContextMenu(null);
    setChatOverrides((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        is_pinned: nextPinned,
      },
    }));

    try {
      await setChatPinned({ chatId, pinned: nextPinned }).unwrap();
      refetch();
    } catch (error: any) {
      setChatOverrides((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          is_pinned: !!chat?.is_pinned,
        },
      }));
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || 'Failed to update pinned chat',
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{translations.loading || 'Loading chats...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full bg-background text-foreground flex flex-col relative">
      {/* Header */}
      <ChatsListHeader
        translations={translations}
        onOpenSearch={(rect: DOMRect) => handleOpenSearch(rect)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Overlay search that covers the chat list area when active */}
      {overlayVisible && (
        <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden">
          {/* expanding circle background */}
          {circleStyle && (
            <div
              aria-hidden
              style={{
                left: circleStyle.left,
                top: circleStyle.top,
                width: circleStyle.size,
                height: circleStyle.size,
              }}
              className={`absolute rounded-full bg-white/90 transform transition-transform duration-300 ease-out ${
                circleActive ? 'scale-100' : 'scale-0'
              }`}
            />
          )}

          {/* overlay content sits above the circle */}
          <div
            id="search-overlay"
            className={`absolute inset-0 p-4 overflow-auto flex flex-col ${
              showSearch ? 'opacity-100 duration-300 translate-y-0' : 'opacity-0 duration-200 translate-y-2'
            } transition-all`}
            style={{
              // ensure overlay content is above the circle
              zIndex: 60,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{translations.search}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleCloseSearch} className="p-1 rounded-full hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <SearchUsers
              currentUsername={username}
              translations={translations}
              onCreated={() => { refetch(); handleCloseSearch(); }}
              onClose={() => handleCloseSearch()}
              onOpenPreview={(previewUsername: string) => {
                // If a one-on-one chat with this user already exists, open it instead of creating a preview
                const existing = (oneOnOneChatsData?.chats || []).find((c: any) => {
                  const name = (c.interlocutor_name || '').toLowerCase();
                  return name === previewUsername.toLowerCase();
                });
                if (existing) {
                  onChatOpen(
                    existing.id,
                    existing.interlocutor_name,
                    existing.interlocutor_deleted || false,
                    'one-on-one',
                    existing.interlocutor_display_name || existing.interlocutor_name,
                    existing.interlocutor_is_online,
                    existing.interlocutor_last_seen,
                    null,
                    existing.avatar_url ? `${BASE_URL}${existing.avatar_url}` : DEFAULT_AVATAR
                  );
                  handleCloseSearch();
                  return;
                }

                // open a temporary (fake) chat — real chat will be created when the first message is sent
                const tempId = -Date.now();
                onChatOpen(tempId, previewUsername, false, 'one-on-one');
                handleCloseSearch();
              }}
            />
          </div>
        </div>
      )}

      {/* Chats list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <MessageSquare className="w-12 h-12" />
            <p>{translations.noChats}</p>
          </div>
        ) : (
          chats.map((chat) => {
            const ownLastMessage = isOwnLastMessage(chat.last_message);
            const ownLastMessageRead = isOwnLastMessageRead(chat.last_message);
            const ownLastMessageFailed = ownLastMessage && !!chat.last_message?.delivery_error;

            return (
            <div
              key={chat.id}
              onClick={() => handleChatClick(chat)}
              onContextMenu={(event) => handleChatContextMenu(event, chat)}
              className={`motion-list-item motion-press flex items-center p-3 rounded-lg cursor-pointer ${
                chat.id === activeChatId
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="relative mr-3">
                <img
                  src={chat.avatar_url}
                  alt={chat.display_name || chat.name}
                  className={`motion-avatar w-10 h-10 rounded-full object-cover ${
                    chat.interlocutor_deleted ? 'opacity-50' : ''
                  }`}
                />
                {chat.type === 'one-on-one' && !chat.interlocutor_deleted && (
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                      chat.is_online ? 'motion-presence bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`flex min-w-0 items-center gap-1.5 ${chat.unread_count ? 'font-semibold' : 'font-medium'}`}>
                  {chat.is_pinned && (
                    <Pin className={`h-3.5 w-3.5 shrink-0 ${chat.id === activeChatId ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
                  )}
                  <span className="truncate">
                    {chat.interlocutor_deleted ? translations.deletedUser : chat.display_name || chat.name}
                  </span>
                </div>
                <div className={`truncate text-xs ${chat.id === activeChatId ? 'text-primary-foreground/80' : chat.unread_count ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {getLastMessagePreview(chat.last_message)}
                </div>
              </div>
              <div className="ml-2 flex min-w-[44px] flex-col items-end gap-1">
                {chat.last_message && (
                  <span className={`text-[11px] leading-none ${chat.id === activeChatId ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {getLastMessageTime(chat.last_message)}
                  </span>
                )}
                {ownLastMessage && !ownLastMessageFailed ? (
                  <span className={`flex h-5 items-center ${chat.id === activeChatId ? 'text-primary-foreground/80' : ownLastMessageRead ? 'text-primary' : 'text-muted-foreground'}`} title={ownLastMessageRead ? 'Read' : 'Unread'}>
                    {ownLastMessageRead ? <CheckCheck size={16} /> : <Check size={16} />}
                  </span>
                ) : chat.unread_count ? (
                  <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center ${chat.id === activeChatId ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}>
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </span>
                ) : null}
                {chat.type === 'group' && (
                  <span className={`text-xs ${chat.id === activeChatId ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>({translations.group})</span>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {chatContextMenu && (
        <div
          className="fixed z-50 min-w-40 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
          style={{
            left: Math.min(chatContextMenu.x, window.innerWidth - 176),
            top: Math.min(chatContextMenu.y, window.innerHeight - 48),
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            onClick={() => handleTogglePinnedChat(chatContextMenu.chatId)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {chatContextMenu.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            <span>{chatContextMenu.isPinned ? translations.unpin || 'Unpin' : translations.pin || 'Pin'}</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <ConfirmModal
          title={modal.type === 'success' ? translations.success : translations.error}
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText="OK"
          isError={modal.type !== 'success'}
        />
      )}

      {selectedUser && (
        <UserProfileComponentRTK
          username={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default ChatsListComponentRTK;
