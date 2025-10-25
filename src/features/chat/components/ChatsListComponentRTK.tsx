import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Menu, Loader2, Search } from 'lucide-react';
import { Chat } from '@/entities/message';
import UserProfileComponentRTK from '@/features/profiles/UserProfileComponentRTK';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { useGetOneOnOneChatsQuery, useGetGroupChatsQuery, useCreateChatMutation } from '@/app/api/messengerApi';
import SearchUsers from './SearchUsers';
import ChatsListHeader from './ChatsListHeader';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

interface ChatsListComponentProps {
  username: string;
  onChatOpen: (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: number;
  onChatDeleted?: (chatId: number) => void;
}

// WebSocket message interface
interface WebSocketMessage {
  type: 'chat_created' | 'chat_deleted' | 'group_created' | 'error';
  message?: string;
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
}

const ChatsListComponentRTK: React.FC<ChatsListComponentProps> = ({
  username,
  onChatOpen,
  setIsProfileOpen,
  activeChatId,
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

  // Combine loading states and errors
  const isLoading = isLoadingOneOnOne || isLoadingGroups;
  const error = oneOnOneError || groupError;
  
  const refetch = () => {
    refetchOneOnOne();
    refetchGroups();
  };

  // Local state
  const [targetUser, setTargetUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [modal, setModal] = useState<{
    type: 'error' | 'success' | 'validation' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  
  const token = localStorage.getItem('access_token');
  const wsRef = useRef<WebSocket | null>(null);
  const { translations } = useLanguage();

  // search logic moved to SearchUsers component

  // Transform the API data to match your existing Chat interface with proper avatar URLs
  const chats: Chat[] = React.useMemo(() => {
    const oneOnOneChats: Chat[] = (oneOnOneChatsData?.chats || []).map((chat) => ({
      id: chat.id,
      name: chat.interlocutor_name,
      interlocutor_name: chat.interlocutor_name,
      avatar_url: chat.avatar_url ? `${BASE_URL}${chat.avatar_url}` : DEFAULT_AVATAR,
      interlocutor_deleted: chat.interlocutor_deleted || false,
      type: 'one-on-one' as const,
    }));

    const groupChats: Chat[] = (groupChatsData?.groups || []).map((group) => ({
      id: group.chat_id,
      name: group.name,
      interlocutor_name: group.name,
      avatar_url: DEFAULT_GROUP_AVATAR,
      interlocutor_deleted: false,
      type: 'group' as const,
    }));

    return [...oneOnOneChats, ...groupChats];
  }, [oneOnOneChatsData, groupChatsData]);

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
          localStorage.removeItem('access_token');
          window.location.href = '/';
        } : undefined,
      });
    }
  }, [error, translations]);

  // WebSocket setup (keeping your existing WebSocket logic)
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected for chat list');
        return;
      }

      console.log('Connecting WebSocket for chat list');
      wsRef.current = new WebSocket(`${WS_URL}/ws/chat/0?token=${token}`);

      wsRef.current.onopen = () => {
        console.log('WebSocket successfully connected for chat list');
      };

      wsRef.current.onmessage = (event) => {
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
            // Refetch chats when a new chat is created
            refetch();
            break;
          case 'chat_deleted':
            if (parsedData.chat_id && onChatDeleted) {
              onChatDeleted(parsedData.chat_id);
            }
            // Refetch chats when a chat is deleted
            refetch();
            break;
          case 'error':
            setModal({
              type: 'error',
              message: parsedData.message || 'Unknown error',
            });
            break;
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected for chat list');
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (token) connectWebSocket();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error for chat list:', error);
      };
    };

    if (token) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, refetch, onChatDeleted]);

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

  const handleChatClick = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => {
    onChatOpen(chatId, chatName, interlocutorDeleted, type);
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
    <div className="h-full bg-background text-foreground flex flex-col relative">
      {/* Header */}
      <ChatsListHeader
        translations={translations}
        onOpenSearch={() => setShowSearch(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Overlay search that covers the chat list area when active */}
      {showSearch && (
        <div className="absolute inset-0 bg-white z-50 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{translations.username}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSearch(false)} className="px-3 py-1 rounded-md hover:bg-accent">
                Close
              </button>
            </div>
          </div>
          <SearchUsers
            currentUsername={username}
            translations={translations}
            onCreated={() => { refetch(); setShowSearch(false); }}
            onClose={() => setShowSearch(false)}
          />
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
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatClick(chat.id, chat.name, chat.interlocutor_deleted, chat.type)}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                chat.id === activeChatId
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <img
                src={chat.avatar_url}
                alt={chat.name}
                className={`w-10 h-10 rounded-full mr-3 object-cover ${
                  chat.interlocutor_deleted ? 'opacity-50' : ''
                }`}
              />
              <span className="font-medium">
                {chat.interlocutor_deleted ? translations.deletedUser : chat.name}
              </span>
              {chat.type === 'group' && (
                <span className="ml-2 text-xs text-muted-foreground">({translations.group})</span>
              )}
            </div>
          ))
        )}
      </div>

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