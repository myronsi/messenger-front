import { useState, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { DEFAULT_AVATAR } from '@/shared/base/ui';

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
    let isMounted = true;

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
            read_by: msg.read_by ? JSON.parse(msg.read_by) : [],
          })));
        } else if (response.status === 401) {
          setModal({ type: 'error', message: translations.loginRequired });
          setTimeout(onBack, 2000);
        } else if (response.status === 403) {
          // Forbidden - redirect to root
          onBack();
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
        if (!isMounted) return;
        // avoid creating a second connection while one is connecting/open
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
          console.log('WebSocket already open or connecting');
          return;
        }
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max WebSocket reconnect attempts reached');
          // Don't set modal here since it's already handled in onclose
          return;
        }
        wsRef.current = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${token}`);
        wsRef.current.onopen = () => {
          if (!isMounted) {
            try { wsRef.current?.close(1000, 'Component unmounted'); } catch (e) {}
            wsRef.current = null;
            return;
          }
          console.log('WebSocket connected');
          reconnectAttempts.current = 0;
          // If there is a pending message stored in sessionStorage (created during preview mode), send it now
          try {
            const pendingKey = `pendingMsg:${chatId}`;
            const pending = sessionStorage.getItem(pendingKey);
            if (pending && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const escaped = escapeCurlyBraces(pending);
              wsRef.current.send(JSON.stringify({ type: 'message', content: escaped, reply_to: null }));
              sessionStorage.removeItem(pendingKey);
            }
          } catch (e) {
            console.warn('Error sending pending message from sessionStorage', e);
          }
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
              read_by: [],
            };
            // deduplicate optimistic messages: if we have a pending message with same sender and content, replace it
            setMessages((prev) => {
              try {
                const pendingIndex = prev.findIndex((m) =>
                  m.id < 0 &&
                  m.sender === newMessage.sender &&
                  typeof m.content === 'string' &&
                  typeof newMessage.content === 'string' &&
                  (m.content === newMessage.content || m.content === unescapeCurlyBraces(String(newMessage.content)))
                );
                if (pendingIndex !== -1) {
                  const copy = [...prev];
                  copy[pendingIndex] = newMessage;
                  return copy;
                }
              } catch (e) {
                console.warn('Error while deduping optimistic message:', e);
              }
              return [...prev, newMessage];
            });
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
          } else if (parsedData.type === 'is_read') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === parsedData.message_id
                  ? { ...msg, read_by: [...(msg.read_by || []), { user_id: parsedData.user_id, read_at: parsedData.timestamp }] }
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
          // Don't log error if component has unmounted (expected cleanup race)
          if (!isMounted) return;
          console.error('WebSocket error:', error);
          // Only show error modal if we've exceeded max reconnect attempts
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setModal({ type: 'error', message: translations.webSocketError });
          }
        };
        wsRef.current.onclose = (event) => {
          // don't attempt reconnect when component has unmounted
          if (!isMounted) {
            wsRef.current = null;
            return;
          }
          console.log('WebSocket closed, code:', event.code);
          if (event.code !== 1000 && event.code !== 1005 && event.code !== 1006) {
            reconnectAttempts.current += 1;
            // Only show error modal if we've exceeded max attempts
            if (reconnectAttempts.current >= maxReconnectAttempts) {
              console.error('Max WebSocket reconnect attempts reached');
              setModal({ type: 'error', message: translations.webSocketError });
            } else {
              // Try to reconnect with exponential backoff
              setTimeout(() => { if (isMounted) connectWebSocket(); }, 1000 * reconnectAttempts.current);
            }
          }
        };
      };
      connectWebSocket();
    }
    return () => {
      isMounted = false;
      if (wsRef.current) {
        try { wsRef.current.close(1000, 'Component unmounted'); } catch (e) {}
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

    const contentToSend = messageInput.trim();
    const escapedMessage = escapeCurlyBraces(contentToSend);

    // optimistic UI: add a temporary message with negative id so user sees it immediately
    const tempId = -Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      sender: username,
      content: contentToSend,
      timestamp: new Date().toISOString(),
      avatar_url: `${BASE_URL}${DEFAULT_AVATAR}`,
      reply_to: replyTo?.id || null,
      is_deleted: false,
      type: 'message',
      reactions: [],
      read_by: [],
    };
    setMessages((prev) => [...prev, optimisticMessage]);

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
