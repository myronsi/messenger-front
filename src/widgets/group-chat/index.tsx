import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { FileMessageContent, Message, ModalState, ReactionInfo } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { MessageHistoryResponse, mergeFreshHistoryMessages, normalizeHistoryMessages, prependUniqueMessages } from '@/entities/message';
import MessageList from '@/widgets/chat-room/ui/MessageList';
import MessageInput from '@/widgets/chat-room/ui/MessageInput';
import ContextMenu from '@/widgets/chat-room/ui/ContextMenu';
import ReactionMenu from '@/widgets/chat-room/ui/ReactionMenu';
import Modal from '@/widgets/chat-room/ui/Modal';
import ForwardMessageDialog from '@/widgets/chat-room/ui/ForwardMessageDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import GroupProfileDialog, { type GroupDetails, type GroupParticipant, type GroupPendingInvite, type GroupProfileConfirmState, type GroupRole } from './GroupProfileDialog';
import { authFetch, ensureAccessToken, useAccessToken } from '@/shared/auth/session';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { messengerApi, useGetGroupDetailsQuery, useGetMessageHistoryQuery } from '@/app/api/messengerApi';
import { useAppDispatch } from '@/shared/hooks/redux';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const MESSAGE_PAGE_SIZE = 50;

const getLocalUploadFileType = (fileName: string, mimeType = '') => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'].includes(extension)) return 'image';
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.ogg'].includes(extension)) return 'video';
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(extension)) return 'audio';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return 'document';
  if (extension === '.pptx') return 'presention';
  if (extension === '.zip') return 'arcive';
  if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(extension)) return 'code';
  return 'none';
};

interface GroupComponentProps {
  chatId: number;
  groupName: string;
  username: string;
  firstUnreadMessageId?: number | null;
  onBack: () => void;
  onOpenUserProfile?: (username: string) => void;
  messageJumpRequest?: { messageId: number; key: number } | null;
}

const permissionsForRole = (role?: GroupRole | null) => ({
  can_edit_group: role === 'owner' || role === 'admin',
  can_manage_participants: role === 'owner' || role === 'admin',
  can_assign_roles: role === 'owner' || role === 'admin',
  can_delete_any_message: role === 'owner' || role === 'admin' || role === 'moderator',
  can_delete_group: role === 'owner',
  can_transfer_ownership: role === 'owner',
});

const GroupComponent: React.FC<GroupComponentProps> = ({
  chatId,
  groupName,
  username,
  firstUnreadMessageId,
  onBack,
  onOpenUserProfile,
  messageJumpRequest = null,
}) => {
  const token = useAccessToken() || '';
  const dispatch = useAppDispatch();
  const { translations, language } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean; isClosing?: boolean } | null>(null);
  const [reactionMenu, setReactionMenu] = useState<{ message: Message; x: number; y: number; isClosing?: boolean } | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [groupConfirm, setGroupConfirm] = useState<GroupProfileConfirmState | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupForm, setGroupForm] = useState({ name: groupName, description: '' });
  const [participantInput, setParticipantInput] = useState('');
  const [isGroupProfileOpen, setIsGroupProfileOpen] = useState(false);
  const [renderGroupProfile, setRenderGroupProfile] = useState(false);
  const [isGroupProfileClosing, setIsGroupProfileClosing] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [readStatusMessage, setReadStatusMessage] = useState<Message | null>(null);
  const [reactionDetails, setReactionDetails] = useState<{ message: Message; reaction: string; reactions: ReactionInfo[] } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId);
  const {
    data: latestHistory,
    isLoading: isLoadingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE },
    {
      skip: !token || chatId <= 0,
      refetchOnMountOrArgChange: true,
    }
  );

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (isGroupProfileOpen) {
      setRenderGroupProfile(true);
      setIsGroupProfileClosing(true);
      const frameId = window.requestAnimationFrame(() => setIsGroupProfileClosing(false));
      return () => window.cancelAnimationFrame(frameId);
    }

    if (!renderGroupProfile) return;
    setIsGroupProfileClosing(true);
    const timeoutId = window.setTimeout(() => {
      setRenderGroupProfile(false);
      setIsGroupProfileClosing(false);
      setGroupConfirm(null);
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [isGroupProfileOpen, renderGroupProfile]);

  const requestCloseGroupProfile = useCallback(() => {
    if (isGroupProfileClosing) return;
    setIsGroupProfileOpen(false);
  }, [isGroupProfileClosing]);

  const openGroupProfile = useCallback(() => {
    setIsGroupProfileOpen(true);
  }, []);

  useEffect(() => {
    setIsLoadingInitialMessages(isLoadingLatestHistory && messages.length === 0);
  }, [isLoadingLatestHistory, messages.length]);

  useEffect(() => {
    if (!latestHistory) return;

    const nextMessages = normalizeHistoryMessages(latestHistory.history);
    setMessages((prev) => mergeFreshHistoryMessages(prev, nextMessages));
    setOldestMessageId(nextMessages[0]?.id || null);
    setHasMoreMessages(!!latestHistory.has_more);
    setIsLoadingInitialMessages(false);
  }, [latestHistory]);

  useEffect(() => {
    if (!latestHistoryError) return;

    const status = (latestHistoryError as any)?.status;
    if (status === 401) {
      setModal({ type: 'error', message: translations.loginRequired });
      setTimeout(onBack, 1000);
      return;
    }
    if (status === 403) {
      onBack();
      return;
    }

    console.error(`Error loading messages for group ${chatId}:`, latestHistoryError);
    setModal({ type: 'error', message: translations.errorLoadingMessages });
    setIsLoadingInitialMessages(false);
  }, [chatId, latestHistoryError, onBack, translations]);

  const getAvatarSrc = (avatarUrl?: string | null) => {
    if (!avatarUrl) return `${BASE_URL}${DEFAULT_AVATAR}`;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const normalizeGroupDetails = useCallback((raw: any): GroupDetails => {
    const participants: GroupParticipant[] = (raw?.participants || []).map((participant: any) => {
      const role = (participant.role || (participant.is_owner ? 'owner' : participant.is_admin ? 'admin' : 'member')) as GroupRole;
      return {
        id: participant.id,
        username: participant.username,
        display_name: participant.display_name || participant.username,
        avatar_url: participant.avatar_url || DEFAULT_AVATAR,
        role,
        is_owner: role === 'owner',
        is_admin: role === 'owner' || role === 'admin',
      };
    });
    const pendingInvites: GroupPendingInvite[] = (raw?.pending_invites || []).map((invite: any) => ({
      request_id: invite.request_id,
      id: invite.id,
      username: invite.username,
      display_name: invite.display_name || invite.username,
      avatar_url: invite.avatar_url || DEFAULT_AVATAR,
      status: 'pending',
    }));
    const currentParticipant = participants.find((participant) => participant.username === username);
    const currentRole = (raw?.current_user_role || currentParticipant?.role || (raw?.owner_username === username ? 'owner' : 'member')) as GroupRole;

    return {
      chat_id: raw.chat_id,
      name: raw.name || groupName,
      description: raw.description || '',
      avatar_url: raw.avatar_url || DEFAULT_GROUP_AVATAR,
      owner_id: raw.owner_id ?? raw.admin_id,
      owner_username: raw.owner_username || raw.admin_username,
      admin_id: raw.admin_id ?? raw.owner_id,
      admin_username: raw.admin_username || raw.owner_username,
      current_user_role: currentRole,
      permissions: permissionsForRole(currentRole),
      participants,
      pending_invites: pendingInvites,
    };
  }, [groupName, username]);

  const currentGroupName = groupDetails?.name || groupForm.name || groupName;
  const currentGroupAvatar = getAvatarSrc(groupDetails?.avatar_url || DEFAULT_GROUP_AVATAR);

  const applyGroupDetails = useCallback((rawDetails: any, syncCache = true) => {
    const data = normalizeGroupDetails(rawDetails);
    setGroupDetails(data);
    setGroupForm({ name: data.name || groupName, description: data.description || '' });

    if (syncCache && chatId > 0) {
      dispatch(messengerApi.util.upsertQueryData('getGroupDetails', chatId, rawDetails));
    }
  }, [chatId, dispatch, groupName, normalizeGroupDetails]);

  const refreshGroupDetails = useCallback(async () => {
    if (!token || chatId <= 0) return;
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error refreshing group details:', error);
    }
  }, [applyGroupDetails, chatId, token]);

  const {
    data: latestGroupDetails,
    error: groupDetailsError,
  } = useGetGroupDetailsQuery(chatId, {
    skip: !token || chatId <= 0,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!latestGroupDetails) return;

    applyGroupDetails(latestGroupDetails, false);
  }, [applyGroupDetails, latestGroupDetails]);

  useEffect(() => {
    if (!groupDetailsError) return;

    console.error(`Error loading group details for ${chatId}:`, groupDetailsError);
  }, [chatId, groupDetailsError]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) return;
      try {
        const response = await authFetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.id);
        }
      } catch (error) {
        console.error('Error fetching current user for group:', error);
      }
    };
    fetchCurrentUser();
  }, [token]);

  const isOwnMessage = useCallback((message: Message) => {
    if (message.is_own) return true;
    if (currentUserId && message.sender_id) return message.sender_id === currentUserId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  }, [currentUserId, username]);

  const createOptimisticUploadMessage = useCallback((
    file: Blob,
    fileName: string,
    fileType = getLocalUploadFileType(fileName, file.type),
    caption = ''
  ) => {
    const tempId = -Date.now();
    const objectUrl = URL.createObjectURL(file);
    const content: FileMessageContent = {
      file_url: objectUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: file.size,
      ...(caption.trim() ? { caption: caption.trim() } : {}),
    };
    const optimisticMessage: Message = {
      id: tempId,
      client_temp_id: tempId,
      local_object_url: objectUrl,
      upload_status: 'uploading',
      upload_progress: 1,
      sender_id: currentUserIdRef.current || currentUserId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      avatar_url: DEFAULT_AVATAR,
      reply_to: null,
      is_deleted: false,
      type: 'file',
      reactions: [],
      read_by: [],
    };

    setMessages((current) => [...current, optimisticMessage]);
    return tempId;
  }, [currentUserId, username]);

  const updateOptimisticUploadProgress = useCallback((messageId: number, percent: number) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
        : message
    )));
  }, []);

  const markOptimisticUploadFailed = useCallback((messageId: number, errorMessage?: string) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? {
            ...message,
            upload_status: 'failed',
            delivery_error: errorMessage || translations.errorLoading || 'Upload failed',
          }
        : message
    )));
  }, [translations.errorLoading]);

  const settleOptimisticUpload = useCallback((messageId: number) => {
    updateOptimisticUploadProgress(messageId, 99);
  }, [updateOptimisticUploadProgress]);

  const canDeleteMessage = useCallback((message: Message) => {
    return isOwnMessage(message) || !!groupDetails?.permissions?.can_delete_any_message;
  }, [groupDetails?.permissions?.can_delete_any_message, isOwnMessage]);

  const getFormattedDateLabel = useCallback((timestamp: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
  }, [language]);

  const getMessageTime = useCallback((timestamp: string): string => {
    return formatTime(timestamp, language);
  }, [language]);

  const renderMessageContent = (message: Message) => {
    if (message.type === 'message' && typeof message.content === 'string') {
      return <div className="whitespace-pre-wrap break-words">{message.content}</div>;
    }
    return <div />;
  };

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);

    try {
      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
        before_id: String(oldestMessageId),
      });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
        const olderMessages = normalizeHistoryMessages(data.history);
        setMessages((prev) => prependUniqueMessages(prev, olderMessages));
        setHasMoreMessages(!!data.has_more);
        if (olderMessages.length > 0) setOldestMessageId(olderMessages[0].id);
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translations.loginRequired });
        setTimeout(onBack, 1000);
      } else if (response.status === 403) {
        onBack();
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error(`Error loading older group messages for ${chatId}:`, error);
      setModal({ type: 'error', message: translations.errorLoadingMessages });
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [chatId, hasMoreMessages, oldestMessageId, onBack, token, translations]);

  const closeMenus = useCallback(() => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  }, []);

  const openMenus = useCallback((message: Message, event: React.MouseEvent) => {
    setReactionMenu({ message, x: event.clientX, y: event.clientY - 45 });
    setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
  }, [isOwnMessage]);

  const handleMessageClick = useCallback((event: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || event.type === 'contextmenu') {
      event.preventDefault();
      event.stopPropagation();
      if (contextMenu?.messageId === message.id && reactionMenu?.message.id === message.id) {
        setIsClosing(true);
        setTimeout(closeMenus, 200);
        return;
      }
      if (contextMenu || reactionMenu) {
        setIsClosing(true);
        setTimeout(() => {
          closeMenus();
          openMenus(message, event);
        }, 200);
        return;
      }
      openMenus(message, event);
    }
  }, [closeMenus, contextMenu, openMenus, reactionMenu]);

  const scrollToMessage = (messageId: number) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
  };

  const jumpToSearchResult = (messageId: number) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTempHighlightedMessageId(messageId);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
      return;
    }
    scrollToMessage(messageId);
  };

  useEffect(() => {
    if (!messageJumpRequest) return;
    jumpToSearchResult(messageJumpRequest.messageId);
  }, [messageJumpRequest?.key]);

  const handleSendMessage = () => {
    const content = messageInput.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (editingMessage) {
      wsRef.current.send(JSON.stringify({ type: 'edit', message_id: editingMessage.id, content }));
    } else {
      wsRef.current.send(JSON.stringify({ type: 'message', content, reply_to: replyTo?.id || null }));
    }

    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleFileUpload = async (file: File, caption = '') => {
    if (!file) return;

    const optimisticMessageId = createOptimisticUploadMessage(file, file.name, undefined, caption);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());
    if (caption.trim()) {
      formData.append('caption', caption.trim());
    }
    try {
      await uploadWithProgress({
        url: `${BASE_URL}/messages/upload`,
        formData,
        onProgress: (percent) => {
          updateOptimisticUploadProgress(optimisticMessageId, percent);
        },
      });
      settleOptimisticUpload(optimisticMessageId);
    } catch (error) {
      console.error('Group upload error:', error);
      markOptimisticUploadFailed(optimisticMessageId, translations.errorLoading || 'Upload failed');
      setModal({ type: 'error', message: translations.errorLoading });
    } finally {
    }
  };

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
        let parsedData: any;
        try {
          parsedData = JSON.parse(event.data);
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
            content: parsedData.type === 'file' ? parsedData.data : parsedData.data.content,
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
        try { wsRef.current.close(1000, 'Component unmounted'); } catch (error) {}
        wsRef.current = null;
      }
      isLoadingOlderMessagesRef.current = false;
    };
  }, [applyGroupDetails, chatId, onBack, refreshGroupDetails, token, translations, username]);

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      setModal({ type: 'error', message: translations.groupNameRequired || 'Group name is required' });
      return;
    }
    setIsSavingGroup(true);
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupForm.name.trim(), description: groupForm.description.trim() }),
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error updating group:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleGroupAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    } finally {
      event.target.value = '';
    }
  };

  const handleAddParticipant = async (usernameOverride?: string) => {
    const newUsername = (usernameOverride || participantInput).trim();
    if (!newUsername) return;
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      if (data?.participants || data?.pending_invites) {
        applyGroupDetails(data);
      } else {
        await refreshGroupDetails();
      }
      setParticipantInput('');
    } catch (error) {
      console.error('Error adding participant:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleRemoveParticipant = async (participantUsername: string) => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.removeParticipant || 'Remove participant',
        message: translations.removeParticipantConfirm || `Remove @${participantUsername} from this group? They will lose access to the group chat until someone adds them again.`,
        confirmText: translations.remove || 'Remove',
        isDestructive: true,
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(await response.text());
            applyGroupDetails(await response.json());
          } catch (error) {
            console.error('Error removing participant:', error);
            setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
          }
        },
      });
    }, 0);
  };

  const handleRoleChange = async (participantUsername: string, role: GroupRole) => {
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error updating participant role:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleTransferOwner = (participantUsername: string) => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.transferOwnership || 'Transfer ownership',
        message: translations.transferOwnershipConfirm || `Transfer group ownership to @${participantUsername}? They will become the owner and you will stay in the group as an admin.`,
        confirmText: translations.transferOwnership || 'Transfer ownership',
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/${chatId}/transfer-owner`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: participantUsername }),
            });
            if (!response.ok) throw new Error(await response.text());
            applyGroupDetails(await response.json());
          } catch (error) {
            console.error('Error transferring ownership:', error);
            setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
          }
        },
      });
    }, 0);
  };

  const handleLeaveGroup = () => {
    window.setTimeout(() => {
      if (groupDetails?.current_user_role === 'owner') {
        setGroupConfirm({
          title: translations.leaveGroup || 'Leave group',
          message: translations.ownerLeaveGroupHint || 'You are the group owner. Transfer ownership before leaving the group.',
          isError: true,
          onConfirm: () => setGroupConfirm(null),
        });
        return;
      }

      setGroupConfirm({
        title: translations.leaveGroup || 'Leave group',
        message: translations.leaveGroupConfirm || 'After leaving this group, the following consequences will apply:',
        consequences: translations.leaveGroupConsequences || [
          'You will be removed from the participants list.',
          'You will lose access to new messages and group updates.',
          'Another admin or owner will need to add you back.',
        ],
        confirmText: translations.leaveGroup || 'Leave group',
        isDestructive: true,
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(BASE_URL + '/groups/' + chatId + '/leave', {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + token },
            });
            if (!response.ok) throw new Error(await response.text());
            onBack();
          } catch (error) {
            console.error('Error leaving group:', error);
            setModal({ type: 'error', message: translations.errorLeavingGroup || 'Failed to leave group' });
          }
        },
      });
    }, 0);
  };

  const handleDeleteGroup = () => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.deleteGroup || 'Delete group',
        message: translations.deleteGroupConfirm || 'After deleting this group, the following consequences will apply:',
        consequences: translations.deleteGroupConsequences || [
          'The group will be deleted for every participant.',
          'Members will lose access to this conversation in the app.',
          'This action cannot be undone.',
        ],
        confirmText: translations.deleteGroup || 'Delete group',
        isDestructive: true,
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/delete/${chatId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(await response.text());
            onBack();
          } catch (error) {
            console.error('Error deleting group:', error);
            setModal({ type: 'error', message: translations.errorDeletingGroup || 'Failed to delete group' });
          }
        },
      });
    }, 0);
  };

  const handleOpenUserProfile = (profileUsername: string) => {
    requestCloseGroupProfile();
    setReadStatusMessage(null);
    setReactionDetails(null);
    onOpenUserProfile?.(profileUsername);
  };

  const readStatusParticipants = groupDetails?.participants || [];
  const readIds = new Set((readStatusMessage?.read_by || []).map((read) => read.user_id));
  const unreadParticipants = readStatusMessage
    ? readStatusParticipants.filter((participant) => participant.id !== readStatusMessage.sender_id && !readIds.has(participant.id))
    : [];

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="motion-panel-in flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center space-x-4">
          <button onClick={onBack} className="motion-press rounded-full p-2 transition-colors hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={openGroupProfile}
            className="motion-press flex min-w-0 items-center space-x-2 rounded-lg px-1 py-1 text-left outline-none focus:outline-none"
          >
            <img src={currentGroupAvatar} alt={currentGroupName} className="motion-avatar h-9 w-9 rounded-full border border-gray-200 object-cover" />
            <span className="flex min-w-0 flex-col items-start">
              <span className="max-w-[52vw] truncate text-base font-semibold leading-tight sm:max-w-none sm:text-lg">{currentGroupName}</span>
              <span className="max-w-[52vw] truncate text-xs font-normal text-muted-foreground sm:max-w-none">
                {groupDetails?.participants.length || 0} {translations.participants || 'participants'}
                {groupDetails?.description ? ` - ${groupDetails.description}` : ''}
              </span>
            </span>
          </button>
        </div>
      </div>

      <MessageList
        messages={messages}
        username={username}
        userId={currentUserId}
        interlocutorDeleted={false}
        firstUnreadMessageId={firstUnreadMessageId}
        onMessageClick={handleMessageClick}
        onAvatarClick={handleOpenUserProfile}
        highlightedMessageId={highlightedMessageId}
        contextMenuMessageId={contextMenu?.messageId}
        getFormattedDateLabel={getFormattedDateLabel}
        getMessageTime={getMessageTime}
        renderMessageContent={renderMessageContent}
        messageRefs={messageRefs}
        onReplyClick={scrollToMessage}
        wsRef={wsRef}
        onOpenReactionMenu={(message, event) => openMenus(message, event)}
        tempHighlightedMessageId={tempHighlightedMessageId}
        setTempHighlightedMessageId={setTempHighlightedMessageId}
        onLoadOlderMessages={loadOlderMessages}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        isLoadingInitialMessages={isLoadingInitialMessages}
        isGroup
        onOpenReadStatus={(message) => {
          if (isOwnMessage(message)) setReadStatusMessage(message);
        }}
        onOpenReactionDetails={(message, reaction, reactions) => setReactionDetails({ message, reaction, reactions })}
        scrollToBottomKey={chatId}
        onScrollStart={() => {
          if (!contextMenu && !reactionMenu) return;
          closeMenus();
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <MessageInput
          ref={messageInputRef}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onCancelReplyOrEdit={() => {
            setReplyTo(null);
            setEditingMessage(null);
            setMessageInput('');
          }}
          chatId={chatId}
          token={token}
          onVoiceUploadStart={createOptimisticUploadMessage}
          onVoiceUploadProgress={updateOptimisticUploadProgress}
          onVoiceUploadError={markOptimisticUploadFailed}
          onVoiceUploadComplete={settleOptimisticUpload}
        />
      </div>

      {contextMenu && currentUserId > 0 && (
        <ContextMenu
          ref={contextMenuRef}
          contextMenu={contextMenu}
          messages={messages}
          token={token}
          chatId={chatId}
          userId={currentUserId}
          setContextMenu={setContextMenu}
          setEditingMessage={setEditingMessage}
          setMessageInput={setMessageInput}
          setReplyTo={setReplyTo}
          setModal={setModal}
          wsRef={wsRef}
          isClosing={isClosing}
          onClose={closeMenus}
          reactionMenu={reactionMenu}
          setReactionMenu={setReactionMenu}
          messageInputRef={messageInputRef}
          canDeleteMessage={canDeleteMessage}
          onForward={setForwardMessage}
        />
      )}

      {reactionMenu && currentUserId > 0 && (
        <ReactionMenu
          ref={reactionMenuRef}
          reactionMenu={reactionMenu}
          wsRef={wsRef}
          userId={currentUserId}
          setReactionMenu={setReactionMenu}
          onClose={closeMenus}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
        />
      )}

      <GroupProfileDialog
        open={renderGroupProfile}
        isClosing={isGroupProfileClosing}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openGroupProfile();
          } else {
            requestCloseGroupProfile();
          }
        }}
        chatId={chatId}
        groupDetails={groupDetails}
        currentGroupName={currentGroupName}
        currentGroupAvatar={currentGroupAvatar}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        participantInput={participantInput}
        setParticipantInput={setParticipantInput}
        isSavingGroup={isSavingGroup}
        currentUsername={username}
        groupAvatarInputRef={groupAvatarInputRef}
        getAvatarSrc={getAvatarSrc}
        onAvatarUpload={handleGroupAvatarUpload}
        onSaveGroup={handleSaveGroup}
        onAddParticipant={handleAddParticipant}
        onRemoveParticipant={handleRemoveParticipant}
        onRoleChange={handleRoleChange}
        onTransferOwner={handleTransferOwner}
        onLeaveGroup={handleLeaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenUserProfile={handleOpenUserProfile}
        onJumpToMessage={(messageId) => {
          requestCloseGroupProfile();
          jumpToSearchResult(messageId);
        }}
        groupConfirm={groupConfirm}
        onCloseGroupConfirm={() => setGroupConfirm(null)}
      />

      <Dialog open={!!readStatusMessage} onOpenChange={(open) => !open && setReadStatusMessage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translations.readStatus || 'Read status'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium">{translations.readBy || 'Read by'}</h3>
              {(readStatusMessage?.read_by || []).length > 0 ? (
                <div className="space-y-2">
                  {readStatusMessage?.read_by.map((read) => (
                    <button key={read.user_id} type="button" onClick={() => read.username && handleOpenUserProfile(read.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                      <img src={getAvatarSrc(read.avatar_url)} alt={read.display_name || read.username || ''} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{read.display_name || read.username}</div>
                        {read.username && <div className="truncate text-xs text-muted-foreground">@{read.username}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{translations.noReadsYet || 'No reads yet'}</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">{translations.notReadYet || 'Not read yet'}</h3>
              {unreadParticipants.length > 0 ? (
                <div className="space-y-2">
                  {unreadParticipants.map((participant) => (
                    <button key={participant.id} type="button" onClick={() => handleOpenUserProfile(participant.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                      <img src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{participant.display_name || participant.username}</div>
                        <div className="truncate text-xs text-muted-foreground">@{participant.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{translations.everyoneRead || 'Everyone has read this message'}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reactionDetails} onOpenChange={(open) => !open && setReactionDetails(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{reactionDetails?.reaction} {translations.reactions || 'Reactions'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {reactionDetails?.reactions.map((reaction) => (
              <button key={`${reaction.user_id}-${reaction.reaction}`} type="button" onClick={() => reaction.username && handleOpenUserProfile(reaction.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                <img src={getAvatarSrc(reaction.avatar_url)} alt={reaction.display_name || reaction.username || ''} className="h-8 w-8 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{reaction.display_name || reaction.username}</div>
                  {reaction.username && <div className="truncate text-xs text-muted-foreground">@{reaction.username}</div>}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Modal modal={modal} onClose={() => setModal(null)} />
      <ForwardMessageDialog
        open={!!forwardMessage}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
        message={forwardMessage}
        username={username}
        onForwarded={() => setModal({ type: 'copy', message: translations.messageForwarded || 'Message forwarded' })}
      />
    </div>
  );
};

export default GroupComponent;
