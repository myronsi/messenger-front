import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Settings } from 'lucide-react';
import { Message, ModalState, ReactionInfo } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { MessageHistoryResponse, normalizeHistoryMessages, prependUniqueMessages } from '@/entities/message';
import MessageList from '@/widgets/chat-room/ui/MessageList';
import MessageInput from '@/widgets/chat-room/ui/MessageInput';
import ContextMenu from '@/widgets/chat-room/ui/ContextMenu';
import ReactionMenu from '@/widgets/chat-room/ui/ReactionMenu';
import Modal from '@/widgets/chat-room/ui/Modal';
import MessageSearchDialog from '@/widgets/chat-room/ui/MessageSearchDialog';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import GroupSettingsDialog, { GroupDetails, GroupParticipant, GroupRole } from './GroupSettingsDialog';
import { authFetch, ensureAccessToken, useAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const MESSAGE_PAGE_SIZE = 50;

interface GroupComponentProps {
  chatId: number;
  groupName: string;
  username: string;
  firstUnreadMessageId?: number | null;
  onBack: () => void;
  onOpenUserProfile?: (username: string) => void;
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
}) => {
  const token = useAccessToken() || '';
  const { translations, language } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean; isClosing?: boolean } | null>(null);
  const [reactionMenu, setReactionMenu] = useState<{ message: Message; x: number; y: number; isClosing?: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [groupConfirm, setGroupConfirm] = useState<{ title: string; message: string; onConfirm: () => void; isError?: boolean } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupForm, setGroupForm] = useState({ name: groupName, description: '' });
  const [participantInput, setParticipantInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [readStatusMessage, setReadStatusMessage] = useState<Message | null>(null);
  const [reactionDetails, setReactionDetails] = useState<{ message: Message; reaction: string; reactions: ReactionInfo[] } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedMessages = useRef(false);
  const isLoadingOlderMessagesRef = useRef(false);

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
    };
  }, [groupName, username]);

  const currentGroupName = groupDetails?.name || groupForm.name || groupName;
  const currentGroupAvatar = getAvatarSrc(groupDetails?.avatar_url || DEFAULT_GROUP_AVATAR);

  const loadGroupDetails = useCallback(async () => {
    if (!token) return;
    const response = await authFetch(`${BASE_URL}/groups/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text());
    const data = normalizeGroupDetails(await response.json());
    setGroupDetails(data);
    setGroupForm({ name: data.name || groupName, description: data.description || '' });
  }, [chatId, groupName, normalizeGroupDetails, token]);

  useEffect(() => {
    loadGroupDetails().catch((error) => {
      console.error(`Error loading group details for ${chatId}:`, error);
    });
  }, [chatId, loadGroupDetails]);

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
    return currentUserId ? message.sender_id === currentUserId : message.sender_username === username;
  }, [currentUserId, username]);

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
    setTimeout(() => setHighlightedMessageId(null), 1500);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());

    try {
      const response = await authFetch(`${BASE_URL}/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (error) {
      console.error('Group upload error:', error);
      setModal({ type: 'error', message: translations.errorLoading });
    } finally {
      event.target.value = '';
    }
  };

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadMessages = async () => {
      if (hasFetchedMessages.current) return;
      hasFetchedMessages.current = true;
      setIsLoadingInitialMessages(true);
      try {
        const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
        const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isMounted) return;
        if (response.ok) {
          const data: MessageHistoryResponse = await response.json();
          const nextMessages = normalizeHistoryMessages(data.history);
          setMessages(nextMessages);
          setOldestMessageId(nextMessages[0]?.id || null);
          setHasMoreMessages(!!data.has_more);
        } else if (response.status === 401) {
          setModal({ type: 'error', message: translations.loginRequired });
          setTimeout(onBack, 1000);
        } else if (response.status === 403) {
          onBack();
        } else {
          throw new Error(await response.text());
        }
      } catch (error) {
        if (!isMounted) return;
        console.error(`Error loading messages for group ${chatId}:`, error);
        setModal({ type: 'error', message: translations.errorLoadingMessages });
      } finally {
        if (isMounted) setIsLoadingInitialMessages(false);
      }
    };

    const connectWebSocket = async () => {
      if (!isMounted || !token) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

      const wsToken = await ensureAccessToken();
      if (!isMounted || !wsToken) return;

      const socket = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${wsToken}`);
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
            sender: parsedData.username,
            sender_username: parsedData.sender_username || parsedData.username,
            content: parsedData.type === 'file' ? parsedData.data : parsedData.data.content,
            timestamp: parsedData.timestamp,
            avatar_url: parsedData.avatar_url || DEFAULT_AVATAR,
            reply_to: parsedData.data.reply_to || null,
            is_deleted: parsedData.is_deleted || false,
            type: parsedData.type,
            reactions: parsedData.reactions || [],
            read_by: parsedData.read_by || [],
          };
          setMessages((prev) => prev.some((message) => message.id === newMessage.id) ? prev : [...prev, newMessage]);
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
          const nextDetails = normalizeGroupDetails(parsedData.group);
          setGroupDetails(nextDetails);
          setGroupForm({ name: nextDetails.name, description: nextDetails.description || '' });
          if (parsedData.removed_username === username) {
            setModal({ type: 'error', message: translations.groupDeletedOrUnavailable });
            socket.close(1000, 'Removed from group');
            setTimeout(onBack, 1000);
          }
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
      loadMessages().then(() => {
        if (isMounted) connectWebSocket();
      });
    }

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (wsRef.current) {
        try { wsRef.current.close(1000, 'Component unmounted'); } catch (error) {}
        wsRef.current = null;
      }
      hasFetchedMessages.current = false;
      isLoadingOlderMessagesRef.current = false;
    };
  }, [chatId, normalizeGroupDetails, onBack, token, translations]);

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
      const data = normalizeGroupDetails(await response.json());
      setGroupDetails(data);
      setGroupForm({ name: data.name, description: data.description || '' });
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
      setGroupDetails(normalizeGroupDetails(await response.json()));
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    } finally {
      event.target.value = '';
    }
  };

  const handleAddParticipant = async () => {
    const newUsername = participantInput.trim();
    if (!newUsername) return;
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (!response.ok) throw new Error(await response.text());
      setGroupDetails(normalizeGroupDetails(await response.json()));
      setParticipantInput('');
    } catch (error) {
      console.error('Error adding participant:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleRemoveParticipant = async (participantUsername: string) => {
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await response.text());
      setGroupDetails(normalizeGroupDetails(await response.json()));
    } catch (error) {
      console.error('Error removing participant:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleRoleChange = async (participantUsername: string, role: GroupRole) => {
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await response.text());
      setGroupDetails(normalizeGroupDetails(await response.json()));
    } catch (error) {
      console.error('Error updating participant role:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleTransferOwner = (participantUsername: string) => {
    setIsSettingsOpen(false);
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.transferOwnership || 'Transfer ownership',
        message: translations.transferOwnershipConfirm || 'Transfer ownership to this participant?',
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/${chatId}/transfer-owner`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: participantUsername }),
            });
            if (!response.ok) throw new Error(await response.text());
            setGroupDetails(normalizeGroupDetails(await response.json()));
          } catch (error) {
            console.error('Error transferring ownership:', error);
            setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
          }
        },
      });
    }, 0);
  };

  const handleLeaveGroup = () => {
    setIsSettingsOpen(false);
    window.setTimeout(() => {
      if (groupDetails?.current_user_role === 'owner') {
        setGroupConfirm({
          title: translations.leaveGroup || 'Leave group',
          message: translations.ownerLeaveGroupHint || 'Transfer ownership before leaving the group.',
          isError: true,
          onConfirm: () => setGroupConfirm(null),
        });
        return;
      }

      setGroupConfirm({
        title: translations.leaveGroup || 'Leave group',
        message: translations.leaveGroupConfirm || 'Are you sure you want to leave this group?',
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
    setIsSettingsOpen(false);
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.deleteGroup || 'Delete group',
        message: translations.deleteGroupConfirm || 'Are you sure you want to delete this group?',
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
    setIsSettingsOpen(false);
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
    <div className="flex h-full flex-col">
      <div className="motion-panel-in flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-4">
          <button onClick={onBack} className="motion-press rounded-full p-2 transition-colors hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={currentGroupAvatar} alt={currentGroupName} className="motion-avatar h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-tight">{currentGroupName}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {groupDetails?.participants.length || 0} {translations.participants || 'participants'}
              {groupDetails?.description ? ` - ${groupDetails.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="motion-press rounded-full p-2 transition-colors hover:bg-accent"
            title={translations.search || 'Search'}
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="motion-press rounded-full p-2 transition-colors hover:bg-accent"
            title={translations.groupSettings || 'Group settings'}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isLoadingInitialMessages && messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{translations.loading}</div>
      ) : (
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
          isGroup
          onOpenReadStatus={(message) => {
            if (isOwnMessage(message)) setReadStatusMessage(message);
          }}
          onOpenReactionDetails={(message, reaction, reactions) => setReactionDetails({ message, reaction, reactions })}
          scrollToBottomKey={chatId}
        />
      )}

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
      />

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

      <GroupSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
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
        onDeleteGroup={handleDeleteGroup}
        onLeaveGroup={handleLeaveGroup}
        onOpenUserProfile={handleOpenUserProfile}
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

      <MessageSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        messages={messages}
        getMessageTime={getMessageTime}
        onJumpToMessage={jumpToSearchResult}
      />

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
      {groupConfirm && (
        <ConfirmModal
          title={groupConfirm.title}
          message={groupConfirm.message}
          onConfirm={groupConfirm.onConfirm}
          onCancel={() => setGroupConfirm(null)}
          isError={!!groupConfirm.isError}
        />
      )}
    </div>
  );
};

export default GroupComponent;
