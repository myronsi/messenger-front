import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/utils/dateFormatters';
import { DEFAULT_AVATAR } from '@/base/ui';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

export const useChat = (chatId: number, username: string, token: string, onBack: () => void) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const { translations, language } = useLanguage();

  const wsRef = useRef<WebSocket | null>(null);
  const hasFetchedMessages = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const escapeCurlyBraces = (text: string): string => {
    return text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
  };

  const unescapeCurlyBraces = (text: string): string => {
    return text.replace(/\\{/g, '{').replace(/\\}/g, '}');
  };

  useEffect(() => {
    const loadMessages = async () => {
      if (hasFetchedMessages.current) return;
      hasFetchedMessages.current = true;
      try {
        const response = await fetch(`${BASE_URL}/messages/history/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.history.map((msg: any) => ({
            ...msg,
            avatar_url: msg.avatar_url ? `${BASE_URL}${msg.avatar_url}` : `${BASE_URL}${DEFAULT_AVATAR}`,
            reply_to: msg.reply_to || null,
            type: msg.type || 'message',
            content: msg.type === 'file' ? (typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content) : msg.content,
            reactions: msg.reactions ? JSON.parse(msg.reactions) : [],
          })));
        } else if (response.status === 401) {
          setModal({ type: 'error', message: translations.loginRequired });
          setTimeout(onBack, 2000);
        } else {
          throw new Error(translations.errorLoading);
        }
      } catch (err) {
        setModal({ type: 'error', message: translations.errorLoadingMessages });
      }
    };

    if (token) {
      loadMessages();
      const connectWebSocket = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('WebSocket already open');
          return;
        }
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max WebSocket reconnect attempts reached');
          setModal({ type: 'error', message: translations.webSocketError });
          return;
        }
        wsRef.current = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${token}`);
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts.current = 0;
        };
        wsRef.current.onmessage = (event) => {
          const parsedData = JSON.parse(event.data);
          console.log('WebSocket message received:', parsedData);
          if (parsedData.type === 'message' || parsedData.type === 'file') {
            const newMessage: Message = {
              id: parsedData.data.message_id,
              sender: parsedData.username,
              content: parsedData.type === 'file' ? parsedData.data : parsedData.data.content,
              timestamp: parsedData.timestamp,
              avatar_url: parsedData.avatar_url ? `${BASE_URL}${parsedData.avatar_url}` : `${BASE_URL}${DEFAULT_AVATAR}`,
              reply_to: parsedData.data.reply_to || null,
              is_deleted: parsedData.is_deleted || false,
              type: parsedData.type,
              reactions: [],
            };
            setMessages((prev) => [...prev, newMessage]);
          } else if (parsedData.type === 'edit') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === parsedData.message_id ? { ...msg, content: parsedData.new_content } : msg))
            );
          } else if (parsedData.type === 'delete') {
            setMessages((prev) => prev.filter((msg) => msg.id !== parsedData.message_id));
          } else if (parsedData.type === 'reaction_add') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === parsedData.message_id
                  ? { ...msg, reactions: [...(msg.reactions || []), { user_id: parsedData.user_id, reaction: parsedData.reaction }] }
                  : msg
              )
            );
          } else if (parsedData.type === 'reaction_remove') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === parsedData.message_id
                  ? {
                      ...msg,
                      reactions: msg.reactions?.filter(
                        (r) => !(r.user_id === parsedData.user_id && r.reaction === parsedData.reaction)
                      ),
                    }
                  : msg
              )
            );
          } else if (parsedData.type === 'error') {
            setModal({ type: 'error', message: parsedData.message });
          } else if (parsedData.type === 'chat_deleted') {
            setModal({ type: 'error', message: translations.chatDeleted });
            setTimeout(onBack, 1000);
          }
        };
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setModal({ type: 'error', message: translations.webSocketError });
        };
        wsRef.current.onclose = (event) => {
          console.log('WebSocket closed, code:', event.code);
          if (event.code !== 1000 && event.code !== 1005) {
            reconnectAttempts.current += 1;
            setTimeout(connectWebSocket, 1000 * reconnectAttempts.current);
          }
        };
      };
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      hasFetchedMessages.current = false;
    };
  }, [chatId, token, onBack, translations]);

  const scrollToMessage = (messageId: number) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1500);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const escapedMessage = escapeCurlyBraces(messageInput);

    if (editingMessage) {
      wsRef.current.send(JSON.stringify({ type: 'edit', message_id: editingMessage.id, content: escapedMessage }));
    } else {
      wsRef.current.send(JSON.stringify({ type: 'message', content: escapedMessage, reply_to: replyTo?.id || null }));
    }
    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());
    try {
      const response = await fetch(`${BASE_URL}/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
    } catch (err) {
      setModal({ type: 'error', message: translations.errorLoading });
    }
  };

  const handleDeleteChat = () => {
    setModal({
      type: 'deleteChat',
      message: translations.deleteChatConfirm,
      onConfirm: async () => {
        try {
          const response = await fetch(`${BASE_URL}/chats/delete/${chatId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) onBack();
          else throw new Error(translations.errorDeleting);
        } catch (err) {
          setModal({ type: 'error', message: translations.errorDeletingChat });
        }
      },
    });
  };

  const getFormattedDateLabel = (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(date, language, today, yesterday);
  };

  const getMessageTime = (timestamp: string): string => {
    return formatTime(timestamp, language);
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'message' && typeof message.content === 'string') {
      return <div>{unescapeCurlyBraces(message.content)}</div>;
    }
    return null;
  };

  return {
    messages,
    messageInput,
    setMessageInput,
    contextMenu,
    setContextMenu,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    selectedUser,
    setSelectedUser,
    modal,
    setModal,
    highlightedMessageId,
    scrollToMessage,
    handleSendMessage,
    handleFileUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    wsRef,
  };
};
