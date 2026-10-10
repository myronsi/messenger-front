import type { Translations } from '@/shared/contexts/LanguageContext';
import { useRef, useState } from 'react';
import type { Message, ModalState, ReactionInfo } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAccessToken } from '@/shared/auth/session';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { chatDraftKey } from '@/shared/lib/drafts';
import { useChatTransport, useLatest, useMessageHistory, useMessageSender } from '@/features/chat-core';
import type { GroupDetails } from './GroupProfileTypes';
import { useGroupChatSocket } from './useGroupChatSocket';
import { useGroupManagement } from './useGroupManagement';
import { useGroupDetails } from './useGroupDetails';
import { useGroupMessageHelpers } from './useGroupMessageHelpers';
import { useGroupMessageMenus } from './useGroupMessageMenus';
import { useGroupProfilePanel } from './useGroupProfilePanel';
import type { GroupChatViewModel, GroupComponentProps, GroupTranslations } from './groupChatTypes';
import type { Id } from '@/shared/lib/ids';

export const useGroupChatScreen = ({
  chatId, groupName, username, firstUnreadMessageId, onBack, onOpenUserProfile, messageJumpRequest = null,
}: GroupComponentProps): GroupChatViewModel => {
  const token = useAccessToken() || '';
  const dispatch = useAppDispatch();
  const { translations: rawTranslations, language } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;

  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useDraftState(chatDraftKey(chatId), editingMessage === null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [readStatusMessage, setReadStatusMessage] = useState<Message | null>(null);
  const [reactionDetails, setReactionDetails] = useState<{ message: Message; reaction: string; reactions: ReactionInfo[] } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<Id>('');
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupForm, setGroupForm] = useState({ name: groupName, description: '' });
  const [participantInput, setParticipantInput] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const messageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const onBackRef = useLatest(onBack);
  const translationsRef = useLatest(rawTranslations as Translations);
  const currentUserIdRef = useLatest(currentUserId);
  const transport = useChatTransport(chatId);

  const profilePanel = useGroupProfilePanel();
  const { isOwnMessage, canDeleteMessage, getFormattedDateLabel, getMessageTime } = useGroupMessageHelpers({ username, language, currentUserId, groupDetails });
  // Opened from a search result: the first page is the one around that message.
  const [focusMessageId] = useState(() => (messageJumpRequest?.chatId === chatId ? messageJumpRequest.messageId : null));
  const history = useMessageHistory({
    chatId, token, username, firstUnreadMessageId, focusMessageId, messages, setMessages, currentUserIdRef, onBackRef, translationsRef,
    setModal,
  });
  const menus = useGroupMessageMenus({ isOwnMessage, chatId, messageJumpRequest, ensureMessageLoaded: history.ensureMessageLoaded });

  const { currentGroupName, currentGroupAvatar, applyGroupDetails, refreshGroupDetails } = useGroupDetails({
    chatId, username, groupName, token, dispatch, groupDetails, groupForm, setGroupDetails, setGroupForm,
    setCurrentUserId,
  });

  const sender = useMessageSender({
    chatId, username, currentUserId, currentUserIdRef, translations: rawTranslations, translationsRef, transport,
    setMessages, setModal, messageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
  });

  useGroupChatSocket({
    chatId, translations, transport, currentUserIdRef, translationsRef, onBackRef,
    applyGroupDetails, refreshGroupDetails, setMessages, setModal,
    markMessageFailed: sender.markMessageFailed,
    onReconnected: history.catchUpAfterReconnect,
  });

  const {
    handleSaveGroup, handleGroupAvatarUpload, handleAddParticipant, handleRemoveParticipant,
    handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup,
  } = useGroupManagement({
    chatId, token, groupForm, setModal, translations, setIsSavingGroup, applyGroupDetails, participantInput,
    setParticipantInput, refreshGroupDetails, setGroupConfirm: profilePanel.setGroupConfirm, groupDetails,
    onBack,
  });

  const handleOpenUserProfile = (profileUsername: string) => {
    profilePanel.requestCloseGroupProfile();
    setReadStatusMessage(null);
    setReactionDetails(null);
    onOpenUserProfile?.(profileUsername);
  };

  const readIds = new Set((readStatusMessage?.read_by || []).map((read) => read.user_id));
  const unreadParticipants = readStatusMessage
    ? (groupDetails?.participants || []).filter((participant) => participant.id !== readStatusMessage.sender_id && !readIds.has(participant.id))
    : [];

  return {
    chatId, username, token, translations, onBack, firstUnreadMessageId,
    currentUserId, groupDetails, currentGroupAvatar, currentGroupName,
    messages, chatRealtime: transport.realtime, isOwnMessage, canDeleteMessage, getFormattedDateLabel, getMessageTime,
    loadOlderMessages: history.loadOlderMessages,
    hasMoreMessages: history.hasMoreMessages,
    isLoadingOlderMessages: history.isLoadingOlderMessages,
    isLoadingInitialMessages: history.isLoadingInitialMessages,
    loadNewerMessages: history.loadNewerMessages,
    loadLatestMessages: history.loadLatestMessages,
    hasMoreNewerMessages: history.hasMoreNewerMessages,
    isLoadingNewerMessages: history.isLoadingNewerMessages,
    markMessagesRead: history.markMessagesRead,
    ...menus,
    ...profilePanel,
    handleOpenUserProfile,
    messageInputRef, messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage,
    handleSendMessage: sender.handleSendMessage,
    handleResendMessage: sender.handleResendMessage,
    handleFilesUpload: sender.handleFilesUpload,
    cancelUpload: sender.cancelUpload,
    handleVoiceMessage: sender.handleVoiceMessage,
    createOptimisticUploadMessage: sender.createOptimisticUploadMessage,
    updateOptimisticUploadProgress: sender.updateOptimisticUploadProgress,
    markOptimisticUploadFailed: sender.markOptimisticUploadFailed,
    settleOptimisticUpload: sender.settleOptimisticUpload,
    modal, setModal, forwardMessage, setForwardMessage,
    readStatusMessage, setReadStatusMessage, reactionDetails, setReactionDetails, unreadParticipants,
    groupForm, setGroupForm, participantInput, setParticipantInput, isSavingGroup, groupAvatarInputRef,
    handleGroupAvatarUpload, handleSaveGroup, handleAddParticipant, handleRemoveParticipant, handleRoleChange,
    handleTransferOwner, handleLeaveGroup, handleDeleteGroup,
  };
};