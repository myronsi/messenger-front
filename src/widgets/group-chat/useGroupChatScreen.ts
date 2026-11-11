import type { Translations } from '@/shared/contexts/LanguageContext';
import { useCallback, useRef, useState, type SetStateAction } from 'react';
import type { Message, ModalState, ReactionInfo } from '@/entities/message';
import { useConversationMessages } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAccessToken } from '@/shared/auth/session';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useAppDispatch } from '@/shared/hooks/redux';
import type { ComposerDraftHandle } from '@/features/message-composer';
import { useChatTransport, useLatest, useMessageHistory, useMessageSender, useUnsentMessageStorage } from '@/features/chat-core';
import type { GroupDetails } from './GroupProfileTypes';
import { useGroupChatSocket } from './useGroupChatSocket';
import { useGroupManagement } from './useGroupManagement';
import { useGroupDetails } from './useGroupDetails';
import { useGroupMessageHelpers } from './useGroupMessageHelpers';
import { useGroupMessageMenus } from './useGroupMessageMenus';
import { useGroupProfilePanel } from './useGroupProfilePanel';
import type { GroupChatViewModel, GroupComponentProps, GroupTranslations } from './groupChatTypes';

export const useGroupChatScreen = ({
  chatId, groupName, username, firstUnreadMessageId, onBack, onOpenUserProfile, messageJumpRequest = null,
}: GroupComponentProps): GroupChatViewModel => {
  const token = useAccessToken() || '';
  const dispatch = useAppDispatch();
  const { translations: rawTranslations, language } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;

  const { messages, setMessages } = useConversationMessages(chatId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const composerDraftRef = useRef<ComposerDraftHandle | null>(null);
  const getMessageInput = useCallback(() => composerDraftRef.current?.get() ?? '', []);
  const setMessageInput = useCallback((value: SetStateAction<string>) => composerDraftRef.current?.set(value), []);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [readStatusMessage, setReadStatusMessage] = useState<Message | null>(null);
  const [reactionDetails, setReactionDetails] = useState<{ message: Message; reaction: string; reactions: ReactionInfo[] } | null>(null);
  const { data: me } = useGetCurrentUserQuery(undefined, { skip: !token });
  const currentUserId = me?.id ?? 0;
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupForm, setGroupForm] = useState({ name: groupName, description: '' });
  const [participantInput, setParticipantInput] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const onBackRef = useLatest(onBack);
  const translationsRef = useLatest(rawTranslations as Translations);
  const currentUserIdRef = useLatest(currentUserId);
  const transport = useChatTransport();

  const profilePanel = useGroupProfilePanel();
  const { isOwnMessage, canDeleteMessage, getFormattedDateLabel, getMessageTime } = useGroupMessageHelpers({ username, language, currentUserId, groupDetails });
  const menus = useGroupMessageMenus({ isOwnMessage, messageJumpRequest });

  const history = useMessageHistory({
    chatId, token, username, firstUnreadMessageId, messages, setMessages, currentUserIdRef, onBackRef, translationsRef, setModal,
  });

  const { getAvatarSrc, currentGroupName, currentGroupAvatar, applyGroupDetails, refreshGroupDetails } = useGroupDetails({
    chatId, username, groupName, token, dispatch, groupDetails, groupForm, setGroupDetails, setGroupForm,
  });

  const sender = useMessageSender({
    chatId, username, currentUserId, currentUserIdRef, translations: rawTranslations, translationsRef, transport,
    setMessages, setModal, getMessageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
  });

  useUnsentMessageStorage({
    chatId, messages, setMessages, resend: sender.resendPending, notConfirmed: rawTranslations.messageDeliveryNotConfirmed,
  });

  useGroupChatSocket({
    token, chatId, username, translations, transport, currentUserIdRef, translationsRef, onBackRef,
    applyGroupDetails, refreshGroupDetails, setMessages, setModal,
    markMessageFailed: sender.markMessageFailed, markLatestPendingMessageFailed: sender.markLatestPendingMessageFailed,
    onReconnected: () => { sender.resendUnconfirmed(); void history.catchUpAfterReconnect(); },
    onOpened: () => { void history.catchUpAfterReconnect(true); },
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

  const handleOpenMemberProfile = (profileUsername: string) => {
    if (onOpenUserProfile) profilePanel.openMemberProfile(profileUsername);
  };

  const readIds = new Set((readStatusMessage?.read_by || []).map((read) => read.user_id));
  const unreadParticipants = readStatusMessage
    ? (groupDetails?.participants || []).filter((participant) => participant.id !== readStatusMessage.sender_id && !readIds.has(participant.id))
    : [];

  return {
    chatId, username, token, translations, onBack, firstUnreadMessageId,
    currentUserId, groupDetails, currentGroupAvatar, currentGroupName, getAvatarSrc,
    messages: history.preview ?? messages, wsRef: transport.wsRef, isOwnMessage, canDeleteMessage, getFormattedDateLabel, getMessageTime,
    loadOlderMessages: history.loadOlderMessages,
    hasMoreMessages: history.hasMoreMessages,
    isLoadingOlderMessages: history.isLoadingOlderMessages,
    isLoadingInitialMessages: history.isLoadingInitialMessages,
    loadNewerMessages: history.loadNewerMessages,
    loadLatestMessages: history.loadLatestMessages,
    loadMessagesAround: history.loadMessagesAround,
    hasMoreNewerMessages: history.hasMoreNewerMessages,
    isLoadingNewerMessages: history.isLoadingNewerMessages,
    markMessagesRead: history.preview ? undefined : history.markMessagesRead,
    ...menus,
    ...profilePanel,
    handleOpenUserProfile,
    handleOpenMemberProfile,
    messageInputRef, composerDraftRef, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage,
    handleSendMessage: sender.handleSendMessage,
    handleSendSticker: sender.handleSendSticker,
    handleResendMessage: sender.handleResendMessage,
    handleFileUpload: sender.handleFileUpload,
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
