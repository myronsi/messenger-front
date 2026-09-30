import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Message, ModalState, ReactionInfo } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAccessToken } from '@/shared/auth/session';
import { normalizeHistoryMessages, mergeFreshHistoryMessages } from '@/entities/message';
import { useGetMessageHistoryQuery } from '@/app/api/messengerApi';
import { useAppDispatch } from '@/shared/hooks/redux';
import type { GroupDetails, GroupProfileConfirmState } from './GroupProfileTypes';
import { useGroupChatSocket } from './useGroupChatSocket';
import { useGroupMessageActions } from './useGroupMessageActions';
import { useGroupManagement } from './useGroupManagement';
import { useGroupDetails } from './useGroupDetails';
import type { GroupChatViewModel, GroupComponentProps, GroupTranslations } from './groupChatTypes';
import { MESSAGE_PAGE_SIZE } from './groupChatUtils';

export const useGroupChatScreen = ({ chatId, groupName, username, firstUnreadMessageId, onBack, onOpenUserProfile, messageJumpRequest = null }: GroupComponentProps): GroupChatViewModel => {
  const token = useAccessToken() || '';
  const dispatch = useAppDispatch();
  const { translations: rawTranslations, language } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;

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

    const status = (latestHistoryError as { status?: number } | undefined)?.status;
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

  const { getAvatarSrc, currentGroupName, currentGroupAvatar, applyGroupDetails, refreshGroupDetails } = useGroupDetails({ chatId, username, groupName, token, dispatch, groupDetails, groupForm, setGroupDetails, setGroupForm, setCurrentUserId });

  const isOwnMessage = useCallback((message: Message) => {
    if (message.is_own) return true;
    if (currentUserId && message.sender_id) return message.sender_id === currentUserId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  }, [currentUserId, username]);

  const { createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed, settleOptimisticUpload, canDeleteMessage, getFormattedDateLabel, getMessageTime, loadOlderMessages, closeMenus, openMenus, handleMessageClick, scrollToMessage, jumpToSearchResult, handleSendMessage, handleFileUpload } = useGroupMessageActions({ chatId, token, username, language, translations, currentUserId, currentUserIdRef, messages, setMessages, isOwnMessage, groupDetails, setHighlightedMessageId, setTempHighlightedMessageId, setModal, oldestMessageId, hasMoreMessages, isLoadingOlderMessagesRef, setIsLoadingOlderMessages, setHasMoreMessages, setOldestMessageId, onBack, contextMenu, reactionMenu, setContextMenu, setReactionMenu, setIsClosing, messageRefs, messageJumpRequest, wsRef, messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage });

  useGroupChatSocket({ token, chatId, username, onBack, translations, applyGroupDetails, refreshGroupDetails, wsRef, isLoadingOlderMessagesRef, currentUserIdRef, setMessages, setEditingMessage, setMessageInput, setModal });

  const { handleSaveGroup, handleGroupAvatarUpload, handleAddParticipant, handleRemoveParticipant, handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup } = useGroupManagement({ chatId, token, groupForm, setModal, translations, setIsSavingGroup, applyGroupDetails, participantInput, setParticipantInput, refreshGroupDetails, setGroupConfirm, groupDetails, onBack });

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

  const viewModel: GroupChatViewModel = { onBack, openGroupProfile, currentGroupAvatar, currentGroupName, groupDetails, translations, messages, username, currentUserId, firstUnreadMessageId, handleMessageClick, handleOpenUserProfile, highlightedMessageId, contextMenu, getFormattedDateLabel, getMessageTime, messageRefs, canDeleteMessage, jumpToSearchResult, setHighlightedMessageId, scrollToMessage, wsRef, openMenus, tempHighlightedMessageId, setTempHighlightedMessageId, loadOlderMessages, hasMoreMessages, isLoadingOlderMessages, isLoadingInitialMessages, isOwnMessage, setReadStatusMessage, setReactionDetails, chatId, closeMenus, reactionMenu, messageInputRef, messageInput, setMessageInput, replyTo, editingMessage, handleSendMessage, handleFileUpload, setReplyTo, setEditingMessage, token, createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed, settleOptimisticUpload, contextMenuRef, setContextMenu, setModal, isClosing, setForwardMessage, reactionMenuRef, setReactionMenu, renderGroupProfile, isGroupProfileClosing, requestCloseGroupProfile, groupForm, setGroupForm, participantInput, setParticipantInput, isSavingGroup, groupAvatarInputRef, getAvatarSrc, handleGroupAvatarUpload, handleSaveGroup, handleAddParticipant, handleRemoveParticipant, handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup, groupConfirm, setGroupConfirm, unreadParticipants, readStatusMessage, reactionDetails, modal, forwardMessage };
  return viewModel;

};
