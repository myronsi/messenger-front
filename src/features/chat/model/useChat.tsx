import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { MessageHistoryResponse, normalizeHistoryMessages, prependUniqueMessages } from '@/features/chat/lib/messageHistory';
import { authFetch, ensureAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const MESSAGE_PAGE_SIZE = 50;

export const useChat = (
  chatId: number,
  username: string,
  token: string,
  onBack: () => void,
  currentUserId = 0,
  onPresenceUpdate?: (update: { username: string; is_online: boolean; last_seen: string | null }) => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [connectionRetryKey, setConnectionRetryKey] = useState(0);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [modal, setModal] = useState<{
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const { translations, language } = useLanguage();
  const onBackRef = useRef(onBack);
  const translationsRef = useRef(translations);
  const presenceUpdateRef = useRef(onPresenceUpdate);

  const wsRef = useRef<WebSocket | null>(null);
  const hasFetchedMessages = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const messageQueueRef = useRef<Array<any>>([]);
  const pendingMessageIdsRef = useRef<number[]>([]);
  const isLoadingOlderMessagesRef = useRef(false);

  const escapeCurlyBraces = (text: string): string => {
    return text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
  };

  const unescapeCurlyBraces = (text: string): string => {
    return text.replace(/\\{/g, '{').replace(/\\}/g, '}');
  };

  const normalizeAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return DEFAULT_AVATAR;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const getDeliveryErrorMessage = (message?: string) => {
    const lowerMessage = (message || '').toLowerCase();
    if (lowerMessage.includes('block')) {
      return translationsRef.current.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings.";
    }
    if (lowerMessage.includes('privacy') || lowerMessage.includes('allow') || lowerMessage.includes('permission')) {
      return translationsRef.current.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
    }
    return message || translationsRef.current.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
  };

  const markMessageFailed = (messageId: number, message?: string) => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === messageId
          ? {
              ...item,
              delivery_error: getDeliveryErrorMessage(message),
            }
          : item
      )
    );
    return true;
  };

  const markLatestPendingMessageFailed = (message?: string) => {
    const failedId = pendingMessageIdsRef.current.pop();
    if (!failedId) return false;
    markMessageFailed(failedId, message);
    return true;
  };

  const clearMessageDeliveryError = (messageId: number) => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === messageId
          ? {
              ...item,
              delivery_error: undefined,
            }
          : item
      )
    );
  };

  useEffect(() => {
    onBackRef.current = onBack;
    translationsRef.current = translations;
    presenceUpdateRef.current = onPresenceUpdate;
  }, [onBack, translations, onPresenceUpdate]);

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;

    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);

    try {
      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
        before_id: String(oldestMessageId),
      });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);

      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
        const olderMessages = normalizeHistoryMessages(data.history);
        setMessages((prev) => prependUniqueMessages(prev, olderMessages));
        setHasMoreMessages(!!data.has_more);
        if (olderMessages.length > 0) {
          setOldestMessageId(olderMessages[0].id);
        }
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translationsRef.current.loginRequired });
        setTimeout(() => onBackRef.current(), 2000);
      } else if (response.status === 403) {
        onBackRef.current();
      } else {
        throw new Error(translationsRef.current.errorLoading);
      }
    } catch (err) {
      setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [chatId, hasMoreMessages, oldestMessageId, token]);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (hasFetchedMessages.current) return;
      hasFetchedMessages.current = true;
      setIsLoadingInitialMessages(true);
      try {
        const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
        const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);
        if (response.ok) {
          const data: MessageHistoryResponse = await response.json();
          const nextMessages = normalizeHistoryMessages(data.history);
          setMessages(nextMessages);
          setOldestMessageId(nextMessages[0]?.id || null);
          setHasMoreMessages(!!data.has_more);
        } else if (response.status === 401) {
          setModal({ type: 'error', message: translationsRef.current.loginRequired });
          setTimeout(() => onBackRef.current(), 2000);
        } else if (response.status === 403) {
          // Forbidden - redirect to root
          onBackRef.current();
        } else {
          throw new Error(translationsRef.current.errorLoading);
        }
      } catch (err) {
        setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
      } finally {
        setIsLoadingInitialMessages(false);
      }
    };

    if (token) {
      loadMessages();
      const connectWebSocket = async () => {
        if (!isMounted) return;
        // avoid creating a second connection while one is connecting/open
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
          console.log('WebSocket already open or connecting, state:', wsRef.current.readyState);
          return;
        }
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max WebSocket reconnect attempts reached');
          // Don't set modal here since it's already handled in onclose
          return;
        }
        const wsToken = await ensureAccessToken();
        if (!isMounted || !wsToken) return;
        console.log('Attempting to establish WebSocket connection to:', `${WS_URL}/ws/chat/${chatId}`);
        try {
          const socket = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${wsToken}`);
          wsRef.current = socket;

          socket.onopen = () => {
            if (!isMounted) {
              try { socket.close(1000, 'Component unmounted'); } catch (e) {}
              if (wsRef.current === socket) wsRef.current = null;
              return;
            }
            console.log('WebSocket connected');
            reconnectAttempts.current = 0;
            // If there is a pending message stored in sessionStorage (created during preview mode), send it now
            try {
              const pendingKey = `pendingMsg:${chatId}`;
              const pending = sessionStorage.getItem(pendingKey);
              if (pending && socket.readyState === WebSocket.OPEN) {
                const escaped = escapeCurlyBraces(pending);
                socket.send(JSON.stringify({ type: 'message', content: escaped, reply_to: null }));
                sessionStorage.removeItem(pendingKey);
              }
            } catch (e) {
              console.warn('Error sending pending message from sessionStorage', e);
            }
            // Send any queued messages
            console.log('Flushing message queue, length:', messageQueueRef.current.length);
            while (messageQueueRef.current.length > 0 && socket.readyState === WebSocket.OPEN) {
              const queuedMsg = messageQueueRef.current.shift();
              if (queuedMsg) {
                try {
                  socket.send(JSON.stringify(queuedMsg));
                  console.log('Queued message sent:', queuedMsg);
                } catch (error) {
                  console.error('Error sending queued message:', error);
                  // Re-queue the message if send failed
                  messageQueueRef.current.unshift(queuedMsg);
                  break;
                }
              }
            }
          };
          socket.onmessage = (event) => {
            const parsedData = JSON.parse(event.data);
            console.log('WebSocket message received:', parsedData);
            if (parsedData.type === 'message' || parsedData.type === 'file') {
              const newMessage: Message = {
                id: parsedData.data.message_id,
                sender_id: parsedData.sender_id,
                sender: parsedData.username,
                sender_username: parsedData.sender_username || parsedData.username,
                content: parsedData.type === 'file' ? parsedData.data : parsedData.data.content,
                timestamp: parsedData.timestamp,
                avatar_url: normalizeAvatarUrl(parsedData.avatar_url),
                reply_to: parsedData.data.reply_to || null,
                is_deleted: parsedData.is_deleted || false,
                delivery_error: parsedData.delivery_error || undefined,
                type: parsedData.type,
                reactions: parsedData.reactions || [],
                read_by: parsedData.read_by || [],
              };
              // deduplicate optimistic messages: if we have a pending message with same sender and content, replace it
              setMessages((prev) => {
                try {
                  const existingIndex = prev.findIndex((m) => m.id === newMessage.id);
                  if (existingIndex !== -1) {
                    const copy = [...prev];
                    copy[existingIndex] = newMessage;
                    return copy;
                  }
                  const pendingIndex = prev.findIndex((m) =>
                    m.id < 0 &&
                    ((m.sender_id && m.sender_id === newMessage.sender_id) || m.sender === newMessage.sender) &&
                    typeof m.content === 'string' &&
                    typeof newMessage.content === 'string' &&
                    (m.content === newMessage.content || m.content === unescapeCurlyBraces(String(newMessage.content)))
                  );
                  if (pendingIndex !== -1) {
                    const copy = [...prev];
                    pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== copy[pendingIndex].id);
                    copy[pendingIndex] = newMessage;
                    return copy;
                  }
                } catch (e) {
                  console.warn('Error while deduping optimistic message:', e);
                }
                if (prev.some((message) => message.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
            } else if (parsedData.type === 'edit') {
              setMessages((prev) =>
                prev.map((msg) => (
                  msg.id === parsedData.message_id
                    ? { ...msg, content: parsedData.new_content, edited_at: parsedData.timestamp || new Date().toISOString() }
                    : msg
                ))
              );
            } else if (parsedData.type === 'delete') {
              setMessages((prev) => prev.filter((msg) => msg.id !== parsedData.message_id));
            } else if (parsedData.type === 'reaction_add') {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== parsedData.message_id) return msg;
                  const reactions = msg.reactions || [];
                  if (reactions.some((r) => r.user_id === parsedData.user_id && r.reaction === parsedData.reaction)) return msg;
                  return {
                    ...msg,
                    reactions: [
                      ...reactions,
                      {
                        user_id: parsedData.user_id,
                        username: parsedData.username,
                        display_name: parsedData.display_name,
                        avatar_url: parsedData.avatar_url,
                        reaction: parsedData.reaction,
                      },
                    ],
                  };
                })
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
                prev.map((msg) => {
                  if (msg.id !== parsedData.message_id) return msg;
                  const readBy = msg.read_by || [];
                  if (readBy.some((read) => read.user_id === parsedData.user_id)) return msg;
                  return {
                    ...msg,
                    read_by: [
                      ...readBy,
                      {
                        user_id: parsedData.user_id,
                        username: parsedData.username,
                        display_name: parsedData.display_name,
                        avatar_url: parsedData.avatar_url,
                        read_at: parsedData.read_at || parsedData.timestamp,
                      },
                    ],
                  };
                })
              );
            } else if (parsedData.type === 'error') {
              if (parsedData.message_id) {
                markMessageFailed(parsedData.message_id, parsedData.message);
              } else if (!markLatestPendingMessageFailed(parsedData.message)) {
                setModal({ type: 'error', message: parsedData.message });
              }
            } else if (parsedData.type === 'chat_deleted') {
              setModal({ type: 'error', message: translationsRef.current.chatDeleted });
              setTimeout(() => onBackRef.current(), 1000);
            } else if (parsedData.type === 'presence_update' && parsedData.username) {
              presenceUpdateRef.current?.({
                username: parsedData.username,
                is_online: !!parsedData.is_online,
                last_seen: parsedData.last_seen || null,
              });
            }
          };
          socket.onerror = (error) => {
            // Don't log error if component has unmounted (expected cleanup race)
            if (!isMounted) return;
            console.error('WebSocket error:', error);
            // Only show error modal if we've exceeded max reconnect attempts
            if (reconnectAttempts.current >= maxReconnectAttempts) {
              setModal({ type: 'error', message: translationsRef.current.webSocketError });
            }
          };
          socket.onclose = (event) => {
            // don't attempt reconnect when component has unmounted
            if (!isMounted) {
              if (wsRef.current === socket) wsRef.current = null;
              return;
            }
            if (wsRef.current === socket) wsRef.current = null;
            console.log('WebSocket closed, code:', event.code);
            if (event.code !== 1000 && event.code !== 1001) {
              reconnectAttempts.current += 1;
              // Only show error modal if we've exceeded max attempts
              if (reconnectAttempts.current >= maxReconnectAttempts) {
                console.error('Max WebSocket reconnect attempts reached');
                setModal({ type: 'error', message: translationsRef.current.webSocketError });
              } else {
                // Try to reconnect with exponential backoff
                setTimeout(() => { if (isMounted) connectWebSocket(); }, 1000 * reconnectAttempts.current);
              }
            }
          };
        } catch (error) {
          console.error('Error creating WebSocket:', error);
          reconnectAttempts.current += 1;
          setTimeout(() => { if (isMounted) connectWebSocket(); }, 1000 * reconnectAttempts.current);
        }
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
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
      setIsLoadingInitialMessages(false);
      setHasMoreMessages(false);
      setOldestMessageId(null);
    };
  }, [chatId, token, connectionRetryKey]);

  const scrollToMessage = (messageId: number) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1500);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const contentToSend = messageInput.trim();
    const escapedMessage = escapeCurlyBraces(contentToSend);
    const isEditing = !!editingMessage;

    let tempId: number | null = null;
    if (editingMessage) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === editingMessage.id
            ? { ...message, content: contentToSend, edited_at: new Date().toISOString() }
            : message
        )
      );
    } else {
      // optimistic UI: add a temporary message with negative id so user sees it immediately
      tempId = -Date.now();
      const optimisticMessage: Message = {
        id: tempId,
        sender_id: currentUserId || undefined,
        sender: username,
        sender_username: username,
        content: contentToSend,
        timestamp: new Date().toISOString(),
        avatar_url: DEFAULT_AVATAR,
        reply_to: replyTo?.id || null,
        is_deleted: false,
        type: 'message',
        reactions: [],
        read_by: [],
      };
      pendingMessageIdsRef.current.push(tempId);
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    // Prepare the message to send
    const messageToSend = isEditing
      ? { type: 'edit', message_id: editingMessage.id, content: escapedMessage }
      : { type: 'message', content: escapedMessage, reply_to: replyTo?.id || null, client_temp_id: tempId };

    // Helper to send the message
    const sendMsg = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(messageToSend));
          console.log('Message sent via WebSocket:', messageToSend);
        } catch (error) {
          console.error('Error sending message via WebSocket:', error);
          messageQueueRef.current.push(messageToSend);
        }
      } else {
        console.log('WebSocket not ready (state: ' + (wsRef.current?.readyState ?? 'null') + '), queueing message');
        messageQueueRef.current.push(messageToSend);
      }
    };

    // If WebSocket is open, send immediately
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMsg();
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      // If connecting, wait up to 3 seconds for connection to open
      console.log('WebSocket is CONNECTING, waiting for it to open...');
      let waitAttempts = 0;
      const waitInterval = setInterval(() => {
        waitAttempts++;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          clearInterval(waitInterval);
          console.log('WebSocket now open, sending queued message');
          sendMsg();
        } else if (waitAttempts >= 30) { // 30 * 100ms = 3 seconds
          clearInterval(waitInterval);
          console.log('Timeout waiting for WebSocket, queueing message');
          messageQueueRef.current.push(messageToSend);
        }
      }, 100);
    } else {
      // WebSocket is null or closed, queue the message
      console.log('WebSocket not available, queueing message');
      messageQueueRef.current.push(messageToSend);
      setConnectionRetryKey((key) => key + 1);
    }

    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleResendMessage = (message: Message) => {
    if (!message.delivery_error || (currentUserId && message.sender_id !== currentUserId)) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      markMessageFailed(message.id, translationsRef.current.webSocketError);
      setConnectionRetryKey((key) => key + 1);
      return;
    }

    clearMessageDeliveryError(message.id);
    wsRef.current.send(JSON.stringify({ type: 'resend', message_id: message.id }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());
    try {
      const response = await authFetch(`${BASE_URL}/messages/upload`, {
        method: 'POST',
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
          const response = await authFetch(`${BASE_URL}/chats/delete/${chatId}`, {
            method: 'DELETE',
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
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
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    hasMoreMessages,
    scrollToMessage,
    loadOlderMessages,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    wsRef,
  };
};
