import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';
import { ensureAccessToken } from '@/shared/auth/session';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import { escapeCurlyBraces, MAX_WEBSOCKET_RECONNECT_ATTEMPTS, normalizeAvatarUrl, unescapeCurlyBraces } from './chatWebSocketUtils';

interface ChatWebSocketOptions {
  chatId: number;
  token: string;
  username: string;
  onPresenceUpdate?: (update: { username: string; is_online: boolean; last_seen: string | null }) => void;
  connectionRetryKey: number;
  wsRef: MutableRefObject<WebSocket | null>;
  reconnectAttempts: MutableRefObject<number>;
  messageQueueRef: MutableRefObject<any[]>;
  pendingMessageIdsRef: MutableRefObject<number[]>;
  currentUserIdRef: MutableRefObject<number>;
  translationsRef: MutableRefObject<Record<string, any>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setModal: (modal: any) => void;
  applyReadReceiptBatch: (messageIds: number[], readerUserId: number, readAt: string, reader?: { username?: string; display_name?: string; avatar_url?: string }) => void;
  markMessageFailed: (messageId: number, message?: string) => boolean;
  markLatestPendingMessageFailed: (message?: string) => boolean;
}

export const useChatWebSocket = ({
  chatId, token, username, onPresenceUpdate, connectionRetryKey, wsRef, reconnectAttempts,
  messageQueueRef, pendingMessageIdsRef, currentUserIdRef, translationsRef,
  setMessages, setModal, applyReadReceiptBatch, markMessageFailed, markLatestPendingMessageFailed,
}: ChatWebSocketOptions) => {
  const presenceUpdateRef = useRef(onPresenceUpdate);
  useEffect(() => {
    presenceUpdateRef.current = onPresenceUpdate;
  }, [onPresenceUpdate]);
  useEffect(() => {
    let isMounted = true;

    if (token && chatId > 0) {
      const connectWebSocket = async () => {
        if (!isMounted) return;
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
          console.log('WebSocket already open or connecting, state:', wsRef.current.readyState);
          return;
        }
        if (reconnectAttempts.current >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
          console.error('Max WebSocket reconnect attempts reached');
          return;
        }
        const wsToken = await ensureAccessToken();
        if (!isMounted || !wsToken) return;
        const webSocketUrl = getChatWebSocketUrl(chatId, wsToken);
        console.log('Attempting to establish WebSocket connection to:', webSocketUrl.replace(/[?].*$/, ''));
        try {
          const socket = new WebSocket(webSocketUrl);
          wsRef.current = socket;

          socket.onopen = () => {
            if (!isMounted) {
              try { socket.close(1000, 'Component unmounted'); } catch (e) {}
              if (wsRef.current === socket) wsRef.current = null;
              return;
            }
            console.log('WebSocket connected');
            reconnectAttempts.current = 0;
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
            console.log('Flushing message queue, length:', messageQueueRef.current.length);
            while (messageQueueRef.current.length > 0 && socket.readyState === WebSocket.OPEN) {
              const queuedMsg = messageQueueRef.current.shift();
              if (queuedMsg) {
                try {
                  socket.send(JSON.stringify(queuedMsg));
                  console.log('Queued message sent:', queuedMsg);
                } catch (error) {
                  console.error('Error sending queued message:', error);
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
                client_temp_id: parsedData.data.client_temp_id ?? null,
                sender_id: parsedData.sender_id,
                is_own: currentUserIdRef.current
                  ? parsedData.sender_id === currentUserIdRef.current
                  : String(parsedData.sender_username || parsedData.username || '').toLowerCase() === username.toLowerCase(),
                sender: parsedData.username,
                sender_username: parsedData.sender_username || parsedData.username,
                content: parsedData.type === 'file' ? parsedData.data : parsedData.data.content,
                timestamp: parsedData.timestamp,
                avatar_url: normalizeAvatarUrl(parsedData.avatar_url),
                reply_to: parsedData.data.reply_to || null,
                is_deleted: parsedData.is_deleted || false,
                delivery_error: parsedData.delivery_error || undefined,
                forwarded_from: parsedData.forwarded_from || null,
                type: parsedData.type,
                reactions: parsedData.reactions || [],
                read_by: parsedData.read_by || [],
              };
              setMessages((prev) => {
                try {
                  const existingIndex = prev.findIndex((m) => m.id === newMessage.id);
                  if (existingIndex !== -1) {
                    const copy = [...prev];
                    copy[existingIndex] = newMessage;
                    return copy;
                  }
                  const pendingUploadIndex = prev.findIndex((m) => {
                    if (m.upload_status !== 'uploading' || m.type !== 'file' || newMessage.type !== 'file') return false;
                    if (typeof m.content === 'string' || typeof newMessage.content === 'string') return false;
                    const sameSender = (m.sender_id && m.sender_id === newMessage.sender_id) || m.sender === newMessage.sender;
                    return sameSender &&
                      m.content.file_name === newMessage.content.file_name &&
                      m.content.file_size === newMessage.content.file_size;
                  });
                  if (pendingUploadIndex !== -1) {
                    const copy = [...prev];
                    const pendingMessage = copy[pendingUploadIndex];
                    if (pendingMessage.local_object_url) {
                      window.setTimeout(() => URL.revokeObjectURL(pendingMessage.local_object_url as string), 1000);
                    }
                    copy[pendingUploadIndex] = {
                      ...newMessage,
                      client_temp_id: pendingMessage.client_temp_id ?? pendingMessage.id,
                      is_own: pendingMessage.is_own || newMessage.is_own,
                    };
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
                    copy[pendingIndex] = {
                      ...newMessage,
                      client_temp_id: copy[pendingIndex].client_temp_id ?? copy[pendingIndex].id,
                      is_own: copy[pendingIndex].is_own || newMessage.is_own,
                    };
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
              applyReadReceiptBatch(
                parsedData.message_id ? [parsedData.message_id] : [],
                parsedData.user_id,
                parsedData.read_at || parsedData.timestamp || new Date().toISOString(),
                {
                  username: parsedData.username,
                  display_name: parsedData.display_name,
                  avatar_url: parsedData.avatar_url,
                }
              );
            } else if (parsedData.type === 'chat_read_batch') {
              applyReadReceiptBatch(
                parsedData.message_ids || [],
                parsedData.reader_user_id || parsedData.user_id,
                parsedData.read_at || parsedData.timestamp || new Date().toISOString(),
                {
                  username: parsedData.username,
                  display_name: parsedData.display_name,
                  avatar_url: parsedData.avatar_url,
                }
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
            if (!isMounted) return;
            console.error('WebSocket error:', error);
            if (reconnectAttempts.current >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
              setModal({ type: 'error', message: translationsRef.current.webSocketError });
            }
          };
          socket.onclose = (event) => {
            if (!isMounted) {
              if (wsRef.current === socket) wsRef.current = null;
              return;
            }
            if (wsRef.current === socket) wsRef.current = null;
            console.log('WebSocket closed, code:', event.code);
            if (event.code !== 1000 && event.code !== 1001) {
              reconnectAttempts.current += 1;
              if (reconnectAttempts.current >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
                console.error('Max WebSocket reconnect attempts reached');
                setModal({ type: 'error', message: translationsRef.current.webSocketError });
              } else {
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
      isLoadingOlderMessagesRef.current = false;
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
      setIsLoadingNewerMessages(false);
      setIsLoadingInitialMessages(false);
      setHasMoreMessages(false);
      setHasMoreNewerMessages(false);
      setOldestMessageId(null);
      setNewestMessageId(null);
    };
  }, [applyReadReceiptBatch, chatId, token, connectionRetryKey]);
};
