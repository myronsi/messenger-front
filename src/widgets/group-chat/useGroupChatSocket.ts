import React, { useEffect } from 'react';
import type { Message, ModalState } from '@/entities/message';
import type { GroupTranslations, RawGroupDetails } from './groupChatTypes';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { ensureAccessToken } from '@/shared/auth/session';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';

interface GroupSocketData { chat_id?: number; message_id?: number; content?: Message['content']; reply_to?: Message['reply_to']; }
interface GroupSocketEvent { type?: string; data?: GroupSocketData; sender_id?: number; sender_username?: string; username?: string; timestamp?: string; avatar_url?: string; is_deleted?: boolean; delivery_error?: string; forwarded_from?: Message['forwarded_from']; reactions?: Message['reactions']; read_by?: Message['read_by']; message_id?: number; new_content?: string; user_id?: number; reaction?: string; display_name?: string; read_at?: string; group?: RawGroupDetails; removed_username?: string; chat_id?: number; message?: string; }

interface UseGroupChatSocketArgs {
  token: string; chatId: number; username: string; onBack: () => void; translations: GroupTranslations;
  applyGroupDetails: (raw: RawGroupDetails, syncCache?: boolean) => void; refreshGroupDetails: () => Promise<void>;
  wsRef: React.MutableRefObject<WebSocket | null>; isLoadingOlderMessagesRef: React.MutableRefObject<boolean>;
  currentUserIdRef: React.MutableRefObject<number>; setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setEditingMessage: React.Dispatch<React.SetStateAction<Message | null>>;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>; setModal: React.Dispatch<React.SetStateAction<ModalState | null>>;
}

export const useGroupChatSocket = ({ token, chatId, username, onBack, translations, applyGroupDetails, refreshGroupDetails, wsRef, isLoadingOlderMessagesRef, currentUserIdRef, setMessages, setEditingMessage, setMessageInput, setModal }: UseGroupChatSocketArgs) => {
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const connectWebSocket = async () => {
      if (!isMounted || !token) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

      const wsToken = await ensureAccessToken();
      if (!isMounted || !wsToken) return;

      const socket = new WebSocket(getChatWebSocketUrl(chatId, wsToken));
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) {
          socket.close(1000, 'Component unmounted');
          return;
        }
        setMessages((prev) => [...prev]);
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        let parsedData: GroupSocketEvent;
        try {
          parsedData = JSON.parse(event.data) as GroupSocketEvent;
        } catch (error) {
          console.error('Received non-JSON group message:', event.data);
          return;
        }

        if (parsedData.type === 'message' || parsedData.type === 'file') {
          if (parsedData.data?.chat_id !== chatId) return;
          const newMessage: Message = {
            id: parsedData.data.message_id,
            sender_id: parsedData.sender_id,
            is_own: currentUserIdRef.current
              ? parsedData.sender_id === currentUserIdRef.current
              : String(parsedData.sender_username || parsedData.username || '').toLowerCase() === username.toLowerCase(),
            sender: parsedData.username,
            sender_username: parsedData.sender_username || parsedData.username,
            content: parsedData.type === 'file' ? parsedData.data as Message['content'] : parsedData.data.content,
            timestamp: parsedData.timestamp,
            avatar_url: parsedData.avatar_url || DEFAULT_AVATAR,
            reply_to: parsedData.data.reply_to || null,
            is_deleted: parsedData.is_deleted || false,
            delivery_error: parsedData.delivery_error || undefined,
            forwarded_from: parsedData.forwarded_from || null,
            type: parsedData.type,
            reactions: parsedData.reactions || [],
            read_by: parsedData.read_by || [],
          };
          setMessages((prev) => {
            const existingIndex = prev.findIndex((message) => message.id === newMessage.id);
            if (existingIndex !== -1) {
              const copy = [...prev];
              copy[existingIndex] = newMessage;
              return copy;
            }

            const pendingUploadIndex = prev.findIndex((message) => {
              if (message.upload_status !== 'uploading' || message.type !== 'file' || newMessage.type !== 'file') return false;
              if (typeof message.content === 'string' || typeof newMessage.content === 'string') return false;
              const sameSender = (message.sender_id && message.sender_id === newMessage.sender_id) || message.sender === newMessage.sender;
              return sameSender &&
                message.content.file_name === newMessage.content.file_name &&
                message.content.file_size === newMessage.content.file_size;
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

            return [...prev, newMessage];
          });
        } else if (parsedData.type === 'edit') {
          setMessages((prev) => prev.map((message) => (
            message.id === parsedData.message_id
              ? { ...message, content: parsedData.new_content, edited_at: parsedData.timestamp || new Date().toISOString() }
              : message
          )));
          setEditingMessage(null);
          setMessageInput('');
        } else if (parsedData.type === 'delete') {
          setMessages((prev) => prev.filter((message) => message.id !== parsedData.message_id));
        } else if (parsedData.type === 'reaction_add') {
          setMessages((prev) => prev.map((message) => {
            if (message.id !== parsedData.message_id) return message;
            const reactions = message.reactions || [];
            if (reactions.some((reaction) => reaction.user_id === parsedData.user_id && reaction.reaction === parsedData.reaction)) return message;
            return {
              ...message,
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
          }));
        } else if (parsedData.type === 'reaction_remove') {
          setMessages((prev) => prev.map((message) => (
            message.id === parsedData.message_id
              ? { ...message, reactions: (message.reactions || []).filter((reaction) => !(reaction.user_id === parsedData.user_id && reaction.reaction === parsedData.reaction)) }
              : message
          )));
        } else if (parsedData.type === 'is_read') {
          setMessages((prev) => prev.map((message) => {
            if (message.id !== parsedData.message_id) return message;
            const readBy = message.read_by || [];
            if (readBy.some((read) => read.user_id === parsedData.user_id)) return message;
            return {
              ...message,
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
          }));
        } else if (parsedData.type === 'group_updated' && parsedData.group?.chat_id === chatId) {
          if (parsedData.group?.participants) {
            applyGroupDetails(parsedData.group);
          } else {
            void refreshGroupDetails();
          }
          if (parsedData.removed_username === username) {
            setModal({ type: 'error', message: translations.groupDeletedOrUnavailable });
            socket.close(1000, 'Removed from group');
            setTimeout(onBack, 1000);
          }
        } else if (
          (parsedData.type === 'group_invite_rejected' || parsedData.type === 'group_invite_approved') &&
          parsedData.chat_id === chatId
        ) {
          void refreshGroupDetails();
        } else if (parsedData.type === 'chat_deleted' && parsedData.chat_id === chatId) {
          setModal({ type: 'error', message: translations.groupDeleted });
          socket.close(1000, 'Group deleted');
          setTimeout(onBack, 1000);
        } else if (parsedData.type === 'error') {
          setModal({ type: 'error', message: parsedData.message });
        }
      };

      socket.onclose = (event) => {
        if (wsRef.current === socket) wsRef.current = null;
        if (isMounted && event.code !== 1000 && event.code !== 1008) {
          reconnectTimeoutId = setTimeout(connectWebSocket, 1000);
        }
      };

      socket.onerror = (error) => {
        if (isMounted) console.error(`WebSocket error for group ${chatId}:`, error);
      };
    };

    if (token) {
      connectWebSocket();
    }

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (wsRef.current) {
        try { wsRef.current.close(1000, 'Component unmounted'); } catch { wsRef.current = null; }
        wsRef.current = null;
      }
      isLoadingOlderMessagesRef.current = false;
    };
  }, [applyGroupDetails, chatId, currentUserIdRef, isLoadingOlderMessagesRef, onBack, refreshGroupDetails, setEditingMessage, setMessageInput, setMessages, setModal, token, translations, username, wsRef]);

};
