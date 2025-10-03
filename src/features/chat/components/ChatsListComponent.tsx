
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Menu } from 'lucide-react';
import { Chat } from '@/entities/message';
import UserProfileComponent from '@/features/profiles/UserProfileComponent';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

interface ChatsListComponentProps {
  username: string;
  onChatOpen: (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: number;
  onChatDeleted?: (chatId: number) => void;
}

// Интерфейс для сообщений WebSocket
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

const ChatsListComponent: React.FC<ChatsListComponentProps> = ({
  username,
  onChatOpen,
  setIsProfileOpen,
  activeChatId,
  onChatDeleted,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [targetUser, setTargetUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: 'error' | 'success' | 'validation' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const token = localStorage.getItem('access_token');
  const hasFetchedChats = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { translations } = useLanguage();

  useEffect(() => {
    const fetchChats = async () => {
      if (hasFetchedChats.current) return;
      hasFetchedChats.current = true;
      try {
        // Fetch one-on-one chats
        const chatsResponse = await fetch(`${BASE_URL}/chats/list/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!chatsResponse.ok) {
          throw new Error(`${translations.errorLoading}: ${chatsResponse.status}`);
        }
        const chatsData = await chatsResponse.json();

        // Fetch group chats
        const groupsResponse = await fetch(`${BASE_URL}/groups/list/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!groupsResponse.ok) {
          throw new Error(`${translations.errorLoading}: ${groupsResponse.status}`);
        }
        const groupsData = await groupsResponse.json();

        // Combine one-on-one and group chats
        const oneOnOneChats: Chat[] = (chatsData.chats || []).map((chat: any) => ({
          id: chat.id,
          name: chat.interlocutor_name,
          interlocutor_name: chat.interlocutor_name,
          avatar_url: chat.avatar_url || DEFAULT_AVATAR,
          interlocutor_deleted: chat.interlocutor_deleted || false,
          type: 'one-on-one',
        }));

        const groupChats: Chat[] = (groupsData.groups || []).map((group: any) => ({
          id: group.chat_id,
          name: group.name,
          interlocutor_name: group.name,
          avatar_url: DEFAULT_GROUP_AVATAR,
          interlocutor_deleted: false,
          type: 'group',
        }));

        setChats([...oneOnOneChats, ...groupChats]);
      } catch (err: any) {
        console.error(`${translations.errorLoading}:`, err);
        setModal({
          type: 'error',
          message: err.message?.includes('401')
            ? translations.loginRequired
            : translations.errorLoading,
          onConfirm: err.message?.includes('401')
            ? () => {
                localStorage.removeItem('access_token');
                window.location.href = '/';
              }
            : undefined,
        });
      }
    };

    if (token) fetchChats();

    // // Периодический опрос каждые 30 секунд
    // const interval = setInterval(() => {
    //   if (token) {
    //     hasFetchedChats.current = false;
    //     fetchChats();
    //   }
    // }, 30000);

    // Подключение WebSocket для уведомлений
    const connectWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket уже подключён для списка чатов');
        return;
      }

      console.log('Подключение WebSocket для списка чатов');
      wsRef.current = new WebSocket(`${WS_URL}/ws/chat/0?token=${token}`);

      wsRef.current.onopen = () => {
        console.log('WebSocket успешно подключён для списка чатов');
      };

      wsRef.current.onmessage = (event) => {
        let parsedData: WebSocketMessage;
        try {
          parsedData = JSON.parse(event.data);
        } catch (error) {
          console.error('Received non-JSON message:', event.data);
          return;
        }

        const { type, message, chat, group } = parsedData;

        if (type === 'chat_created' && chat) {
          console.log('Received chat_created:', chat);
          setChats((prev) => {
            if (prev.some((c) => c.id === chat.chat_id)) return prev;
            const interlocutor_name = chat.user1 === username ? chat.user2 : chat.user1;
            if (![chat.user1, chat.user2].includes(username)) {
              console.log('Ignoring chat_created: user not a participant');
              return prev;
            }
            const avatar_url =
              chat.user1 === username
                ? chat.user2_avatar_url || DEFAULT_AVATAR
                : chat.user1_avatar_url || DEFAULT_AVATAR;
            return [
              ...prev,
              {
                id: chat.chat_id,
                name: interlocutor_name,
                interlocutor_name,
                avatar_url,
                interlocutor_deleted: false,
                type: 'one-on-one',
              },
            ];
          });
        } else if (type === 'group_created' && group) {
          console.log('Received group_created:', group);
          setChats((prev) => {
            if (prev.some((c) => c.id === group.chat_id)) return prev;
            if (!group.participants.includes(username)) {
              console.log('Ignoring group_created: user not a participant');
              return prev;
            }
            return [
              ...prev,
              {
                id: group.chat_id,
                name: group.name,
                interlocutor_name: group.name,
                avatar_url: DEFAULT_GROUP_AVATAR,
                interlocutor_deleted: false,
                type: 'group',
              },
            ];
          });
        } else if (type === 'chat_deleted' && parsedData.chat_id !== undefined) {
          console.log('Received chat_deleted:', parsedData.chat_id);
          setChats((prev) => prev.filter((c) => c.id !== parsedData.chat_id));
          
          // Notify parent component about chat deletion
          if (onChatDeleted) {
            onChatDeleted(parsedData.chat_id);
          }
        } else if (type === 'error' && message) {
          console.error('Server error:', message);
          setModal({
            type: 'error',
            message,
          });
        } else {
          console.warn('Unknown message type or missing data:', parsedData);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket закрыт. Код:', event.code, 'Причина:', event.reason);
        if (event.code !== 1000 && event.code !== 1005) {
          console.log('Переподключение через 1 секунду...');
          setTimeout(connectWebSocket, 1000);
        }
      };
    };

    if (token) connectWebSocket();

    return () => {
      // clearInterval(interval);
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('Очистка: закрываем WebSocket для списка чатов');
        wsRef.current.close();
      }
    };
  }, [username, token, onChatDeleted, translations]);

  const handleCreateChat = async () => {
    if (!targetUser.trim()) {
      setModal({
        type: 'validation',
        message: translations.enterUsername,
      });
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/chats/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user1: username, user2: targetUser }),
      });
    } catch (err) {
      setModal({
        type: 'error',
        message: translations.networkError,
      });
    }
  };

  const handleChatClick = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => {
    if (chatId === activeChatId) {
      console.log('Чат уже активен, повторное подключение не требуется');
      return;
    }
    onChatOpen(chatId, chatName, interlocutorDeleted, type);
  };

  const handleUserClick = (user: string, interlocutorDeleted: boolean) => {
    if (interlocutorDeleted) {
      setModal({
        type: 'deletedUser',
        message: translations.deletedUserInfo,
      });
      setTimeout(() => setModal(null), 1500);
    } else {
      setSelectedUser(user);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">{translations.chats}</h2>
        <button
          onClick={() => setIsProfileOpen(true)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="flex-grow min-w-0">
          <input
            type="text"
            placeholder={translations.username}
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-ellipsis"
          />
        </div>
        <button
          onClick={handleCreateChat}
          className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

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
                src={`${BASE_URL}${chat.avatar_url}`}
                alt={chat.name}
                className={`w-10 h-10 rounded-full mr-3 ${
                  chat.interlocutor_deleted ? 'opacity-50' : ''
                }`}
                // onClick={(e) => {
                //   e.stopPropagation();
                //   if (chat.type === 'group') return;
                //   handleUserClick(chat.interlocutor_name, chat.interlocutor_deleted);
                // }}
              />
              <span className="font-medium">{chat.interlocutor_deleted ? translations.deletedUser : chat.name}</span>
              {chat.type === 'group' && (
                <span className="ml-2 text-xs text-muted-foreground">({translations.group})</span>
              )}
            </div>
          ))
        )}
      </div>

      {selectedUser && (
        <UserProfileComponent username={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
      
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
    </div>
  );
};

export default ChatsListComponent;
