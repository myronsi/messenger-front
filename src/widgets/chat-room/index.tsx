import React, { useRef, useState, useEffect } from 'react';
import { FileMessageContent, Message } from '@/entities/message';
import { useChat } from './model/useChat';
import { useCreateChatMutation, useGetBlockedUsersQuery, useUnblockUserMutation, useDeleteMessageForMeMutation } from '@/app/api/messengerApi';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import ChatHeader from './ui/ChatHeader';
import MessageList from './ui/MessageList';
import MessageInput from './ui/MessageInput';
import Modal from './ui/Modal';
import ContextMenu from './ui/ContextMenu';
import ReactionMenu from './ui/ReactionMenu';
import { DELETED_AVATAR, DEFAULT_AVATAR } from '@/shared/base/ui';
import MessageSearchDialog from './ui/MessageSearchDialog';
import ForwardMessageDialog from './ui/ForwardMessageDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { authFetch, useAccessToken } from '@/shared/auth/session';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { Loader2 } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL;

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

interface ChatProps {
  chatId: number;
  chatName: string;
  chatDisplayName?: string;
  interlocutorIsOnline?: boolean;
  interlocutorLastSeen?: string | null;
  interlocutorAvatarUrl?: string;
  username: string;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: number | null;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  onOpenUserProfile?: (username: string) => void;
  searchRequestKey?: number;
  messageJumpRequest?: { messageId: number; key: number } | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
  initialPendingApprovalRequest?: boolean;
  initialPendingApprovalMessage?: string;
  // Called when a preview chat is upgraded to a real chat after first message is sent
  onChatCreated?: (newId: number, newName: string) => void;
}

const Chat: React.FC<ChatProps> = ({ chatId, chatName, chatDisplayName, interlocutorIsOnline, interlocutorLastSeen, interlocutorAvatarUrl, username, interlocutorDeleted, firstUnreadMessageId, onBack, setIsUserProfileOpen, onOpenUserProfile, searchRequestKey = 0, messageJumpRequest = null, directDraftDisabled = false, directDraftReason = null, initialPendingApprovalRequest = false, initialPendingApprovalMessage = '', onChatCreated }) => {
  const token = useAccessToken() || '';
  const { translations } = useLanguage();
  const [userId, setUserId] = useState<number | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<number | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [presence, setPresence] = useState({
    is_online: !!interlocutorIsOnline,
    last_seen: interlocutorLastSeen || null,
  });

  const isPreview = chatId <= 0;

  // Mutations for creating a chat and sending messages (used in preview mode)
  const [createChat] = useCreateChatMutation();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const [deleteMessageForMe] = useDeleteMessageForMeMutation();
  const isBlockedByMe = !!blockedUsersData?.users?.some((blockedUser) => blockedUser.username.toLowerCase() === chatName.toLowerCase());

  // When not preview — use the normal hook
  const {
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
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    scrollToMessage,
    loadOlderMessages,
    loadNewerMessages,
    markMessagesRead,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    wsRef,
  } = isPreview ? {
    messages: [] as Message[],
    messageInput: '',
    setMessageInput: (_: string) => {},
    contextMenu: null,
    setContextMenu: (_: any) => {},
    replyTo: null,
    setReplyTo: (_: any) => {},
    editingMessage: null,
    setEditingMessage: (_: any) => {},
    selectedUser: null,
    setSelectedUser: (_: any) => {},
    modal: previewModal,
    setModal: setPreviewModal,
    highlightedMessageId: null,
    isLoadingInitialMessages: false,
    isLoadingOlderMessages: false,
    isLoadingNewerMessages: false,
    hasMoreMessages: false,
    hasMoreNewerMessages: false,
    scrollToMessage: (_: number) => {},
    loadOlderMessages: async () => {},
    loadNewerMessages: async () => {},
    markMessagesRead: async (_: number[]) => {},
    handleSendMessage: () => {},
    handleResendMessage: (_: Message) => {},
    handleFileUpload: (_: any) => {},
    createOptimisticUploadMessage: (_file: Blob, _fileName: string, _fileType?: string, _caption?: string) => null as number | null,
    updateOptimisticUploadProgress: (_messageId: number, _percent: number) => {},
    markOptimisticUploadFailed: (_messageId: number, _errorMessage?: string) => {},
    settleOptimisticUpload: (_messageId: number) => {},
    handleDeleteChat: () => {},
    getFormattedDateLabel: (s: string) => formatDateLabel(s, 'en', new Date(), new Date()),
    getMessageTime: (s: string) => formatTime(s, 'en'),
    renderMessageContent: (m: Message) => <>{typeof m.content === 'string' ? m.content : ''}</>,
    wsRef: { current: null } as any,
  } : useChat(chatId, username, token, onBack, userId || 0, firstUnreadMessageId, (update) => {
    if (update.username === chatName) {
      setPresence({
        is_online: update.is_online,
        last_seen: update.last_seen,
      });
    }
  });

  // Local state & handlers for preview mode
  const [previewMessageInput, setPreviewMessageInput] = useState('');
  const [previewFailedMessages, setPreviewFailedMessages] = useState<Message[]>([]);
  const [isCreatingPreviewChat, setIsCreatingPreviewChat] = useState(false);
  const [hasPendingApprovalRequest, setHasPendingApprovalRequest] = useState(false);

  const getDeliveryBlockedMessage = () => (
    directDraftReason === 'blocked'
      ? translations.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings."
      : directDraftReason === 'self'
      ? translations.messageNotDeliveredSelf || 'This message cannot be sent to yourself.'
      : translations.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.'
  );

  const addFailedPreviewMessage = (content: string) => {
    setPreviewFailedMessages((current) => [
      ...current,
      {
        id: -Date.now(),
        sender_id: userId || undefined,
        is_own: true,
        sender: username,
        sender_username: username,
        content,
        timestamp: new Date().toISOString(),
        type: 'message',
        delivery_error: getDeliveryBlockedMessage(),
        read_by: [],
      },
    ]);
  };

  const createPendingApprovalPreviewMessage = (content: string): Message => ({
    id: -Date.now(),
    sender_id: userId || undefined,
    is_own: true,
    sender: username,
    sender_username: username,
    content,
    timestamp: new Date().toISOString(),
    type: 'message',
    delivery_error: translations.waitingForApproval || 'Waiting for user approval',
    read_by: [],
  });

  const addPendingApprovalPreviewMessage = (content: string) => {
    setPreviewFailedMessages((current) => [
      ...current,
      createPendingApprovalPreviewMessage(content),
    ]);
  };

  const createPreviewUploadMessage = (file: File, caption = '') => {
    const tempId = -Date.now();
    const objectUrl = URL.createObjectURL(file);
    const content: FileMessageContent = {
      file_url: objectUrl,
      file_name: file.name,
      file_type: getLocalUploadFileType(file.name, file.type),
      file_size: file.size,
      ...(caption.trim() ? { caption: caption.trim() } : {}),
    };
    const optimisticMessage: Message = {
      id: tempId,
      client_temp_id: tempId,
      local_object_url: objectUrl,
      upload_status: 'uploading',
      upload_progress: 1,
      sender_id: userId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      type: 'file',
      reactions: [],
      read_by: [],
    };

    setPreviewFailedMessages((current) => [...current, optimisticMessage]);
    return tempId;
  };

  const updatePreviewUploadProgress = (messageId: number, percent: number) => {
    setPreviewFailedMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
        : message
    )));
  };

  const markPreviewUploadFailed = (messageId: number, errorMessage?: string) => {
    setPreviewFailedMessages((current) => current.map((message) => (
      message.id === messageId
        ? {
            ...message,
            upload_status: 'failed',
            delivery_error: errorMessage || translations.errorLoading || 'Upload failed',
          }
        : message
    )));
  };

  const handleSendMessagePreview = async () => {
    const content = previewMessageInput.trim();
    if (!content || isCreatingPreviewChat) return;
    if (hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(content);
      setPreviewMessageInput('');
      return;
    }
    setIsCreatingPreviewChat(true);
    try {
      // create the chat on the server
      const res = await createChat({ user1: username, user2: chatName, initial_message: content }).unwrap();
      if (res.approval_required) {
        setHasPendingApprovalRequest(true);
        if (res.already_pending) {
          setPreviewModal({
            type: 'error',
            message: translations.alreadyWaitingForApproval || 'You already sent a request. Wait for approval before sending more messages.',
          });
        } else {
          addPendingApprovalPreviewMessage(content);
        }
        setPreviewMessageInput('');
        return;
      }
      if (!res.chat_id) {
        throw new Error('Chat was not created');
      }
      const newChatId = res.chat_id;
      setPreviewMessageInput('');
      if (onChatCreated) onChatCreated(newChatId, chatName);
    } catch (err) {
      console.error('Failed to create chat/send message:', err);
      addFailedPreviewMessage(content);
    } finally {
      setIsCreatingPreviewChat(false);
    }
  };

  const handleFileUploadPreview = async (file: File, caption = '') => {
    if (!file || isCreatingPreviewChat) return;
    if (hasPendingApprovalRequest) {
      return;
    }
    if (directDraftDisabled) {
      addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${file.name}`);
      return;
    }
    setIsCreatingPreviewChat(true);
    let optimisticMessageId: number | null = null;
    try {
      const res = await createChat({ user1: username, user2: chatName }).unwrap();
      if (res.approval_required || !res.chat_id) {
        throw new Error(translations.waitingForApproval || 'Waiting for user approval');
      }
      const newChatId = res.chat_id;
      optimisticMessageId = createPreviewUploadMessage(file, caption);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chat_id', newChatId.toString());
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      await uploadWithProgress({
        url: `${BASE_URL}/messages/upload`,
        formData,
        onProgress: (percent) => {
          updatePreviewUploadProgress(optimisticMessageId, percent);
        },
      });
      updatePreviewUploadProgress(optimisticMessageId, 99);
      if (onChatCreated) onChatCreated(newChatId, chatName);
    } catch (err) {
      console.error('Failed to create chat/upload file:', err);
      if (optimisticMessageId !== null) {
        markPreviewUploadFailed(optimisticMessageId, translations.errorLoading || 'Upload failed');
      } else {
        addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${file.name}`);
      }
    } finally {
      setIsCreatingPreviewChat(false);
    }
  };

  const handleUnblockFromChat = async () => {
    if (isUnblockingUser) return;
    try {
      await unblockUser(chatName).unwrap();
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.data?.detail || 'Failed to unblock user',
      });
    }
  };

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const lastSearchRequestKeyRef = useRef(searchRequestKey);
  const [isClosing, setIsClosing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [reactionMenu, setReactionMenu] = useState<{ message: Message; x: number; y: number; isClosing?: boolean } | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (searchRequestKey !== lastSearchRequestKeyRef.current && searchRequestKey > 0 && !isPreview) {
      setIsSearchOpen(true);
    }
    lastSearchRequestKeyRef.current = searchRequestKey;
  }, [isPreview, searchRequestKey]);

  useEffect(() => {
    setIsSearchOpen(false);
    lastSearchRequestKeyRef.current = searchRequestKey;
  }, [chatId, chatName]);

  useEffect(() => {
    setHasPendingApprovalRequest(!!initialPendingApprovalRequest);
    setPreviewFailedMessages(
      initialPendingApprovalRequest && initialPendingApprovalMessage
        ? [createPendingApprovalPreviewMessage(initialPendingApprovalMessage)]
        : []
    );
    setPreviewMessageInput('');
  }, [chatId, chatName, initialPendingApprovalRequest, initialPendingApprovalMessage]);

  useEffect(() => {
    if (!messageJumpRequest || isPreview) return;
    jumpToSearchResult(messageJumpRequest.messageId);
  }, [isPreview, messageJumpRequest?.key]);

  useEffect(() => {
    setPresence({
      is_online: !!interlocutorIsOnline,
      last_seen: interlocutorLastSeen || null,
    });
  }, [interlocutorIsOnline, interlocutorLastSeen, chatName]);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await authFetch(`${BASE_URL}/auth/me`);
        if (response.ok) {
          const data = await response.json();
          setUserId(data.id);
        } else {
          console.error('Failed to fetch user ID');
        }
      } catch (err) {
        console.error('Error fetching user ID:', err);
      }
    };

    if (token) {
      fetchUserId();
    }
  }, [token]);

  const closeMenus = () => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  };

  const isOwnMessage = (message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  };

  const normalizeAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return DEFAULT_AVATAR;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || e.type === 'contextmenu') {
      e.preventDefault();
      if (!interlocutorDeleted) {
        if (contextMenu && contextMenu.messageId === message.id && reactionMenu && reactionMenu.message.id === message.id) {
          setIsClosing(true);
          setTimeout(() => {
            closeMenus();
            setIsClosing(false);
          }, 200);
        } else {
          if (contextMenu || reactionMenu) {
            setIsClosing(true);
            setTimeout(() => {
              closeMenus();
              setIsClosing(false);
              const msgElement = messageRefs.current[message.id];
              if (msgElement) {
                const rect = msgElement.getBoundingClientRect();
                const reactionY = e.clientY - 45;
                setReactionMenu({ message, x: e.clientX, y: reactionY });
                setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: isOwnMessage(message) });
              }
            }, 200);
          } else {
            const msgElement = messageRefs.current[message.id];
            if (msgElement) {
              const rect = msgElement.getBoundingClientRect();
              const reactionY = e.clientY - 45;
              setReactionMenu({ message, x: e.clientX, y: reactionY });
              setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: isOwnMessage(message) });
            }
          }
        }
        e.stopPropagation();
      }
    }
  };

  const onOpenProfile = () => {
    if (onOpenUserProfile) {
      onOpenUserProfile(chatName);
      return;
    }
    setIsUserProfileOpen(true);
  };
  const interlocutorAvatar = interlocutorDeleted 
    ? DELETED_AVATAR 
    : normalizeAvatarUrl(interlocutorAvatarUrl || messages.find(msg => !isOwnMessage(msg))?.avatar_url);

  const jumpToSearchResult = (messageId: number) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTempHighlightedMessageId(messageId);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
    } else {
      scrollToMessage(messageId);
    }
  };

  const displayedMessages = isPreview ? previewFailedMessages : messages;

  const content = (
    <div className="relative flex h-full flex-col overflow-hidden">
      <ChatHeader
        chatName={chatName}
        chatDisplayName={chatDisplayName}
        isOnline={presence.is_online}
        lastSeen={presence.last_seen}
        interlocutorDeleted={interlocutorDeleted}
        onBack={onBack}
        onDeleteChat={handleDeleteChat}
        onOpenProfile={onOpenProfile}
        interlocutorAvatar={interlocutorAvatar}
      />
      <MessageList
          ref={chatWindowRef}
          messages={displayedMessages}
          username={username}
          interlocutorDeleted={interlocutorDeleted}
          firstUnreadMessageId={firstUnreadMessageId}
          onMessageClick={handleMessageClick}
          onAvatarClick={(profileUsername) => {
            if (onOpenUserProfile) {
              onOpenUserProfile(profileUsername);
            } else {
              setSelectedUser(profileUsername);
            }
          }}
          highlightedMessageId={highlightedMessageId}
          contextMenuMessageId={contextMenu?.messageId}
          getFormattedDateLabel={getFormattedDateLabel}
          getMessageTime={getMessageTime}
          renderMessageContent={renderMessageContent}
          messageRefs={messageRefs}
          onReplyClick={scrollToMessage}
          userId={userId || 0}
          wsRef={wsRef}
          onOpenReactionMenu={(message, e) => {
            if (reactionMenu && reactionMenu.message.id === message.id && contextMenu && contextMenu.messageId === message.id) {
              setIsClosing(true);
              setTimeout(() => closeMenus(), 200);
            } else {
              if (contextMenu || reactionMenu) {
                setIsClosing(true);
                setTimeout(() => {
                  closeMenus();
                  const msgElement = messageRefs.current[message.id];
                  if (msgElement) {
                    const rect = msgElement.getBoundingClientRect();
                    const reactionY = e.clientY - 35;
                    setReactionMenu({ message, x: e.clientX, y: reactionY });
                    setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: isOwnMessage(message) });
                  }
                }, 200);
              } else {
                const msgElement = messageRefs.current[message.id];
                if (msgElement) {
                  const rect = msgElement.getBoundingClientRect();
                  const reactionY = e.clientY - 35;
                  setReactionMenu({ message, x: e.clientX, y: reactionY });
                  setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: isOwnMessage(message) });
                }
              }
            }
          }}
          tempHighlightedMessageId={tempHighlightedMessageId}
          setTempHighlightedMessageId={setTempHighlightedMessageId}
          onLoadOlderMessages={loadOlderMessages}
          onLoadNewerMessages={loadNewerMessages}
          hasMoreMessages={hasMoreMessages}
          hasMoreNewerMessages={hasMoreNewerMessages}
          isLoadingInitialMessages={isLoadingInitialMessages}
          isLoadingOlderMessages={isLoadingOlderMessages}
          isLoadingNewerMessages={isLoadingNewerMessages}
          onMarkMessagesRead={markMessagesRead}
          onResendMessage={!isPreview ? handleResendMessage : undefined}
          scrollToBottomKey={chatId}
          onScrollStart={() => {
            if (!contextMenu && !reactionMenu) return;
            closeMenus();
          }}
        />
      {!interlocutorDeleted && !isBlockedByMe && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <MessageInput
            ref={messageInputRef}
            messageInput={isPreview ? previewMessageInput : messageInput}
            setMessageInput={isPreview ? setPreviewMessageInput : setMessageInput}
            replyTo={replyTo}
            editingMessage={editingMessage}
            onSendMessage={isPreview ? handleSendMessagePreview : handleSendMessage}
            onFileUpload={isPreview ? handleFileUploadPreview : handleFileUpload}
            onCancelReplyOrEdit={() => {
              if (isPreview) {
                setPreviewMessageInput('');
              } else {
                setReplyTo(null);
                setEditingMessage(null);
                setMessageInput('');
              }
            }}
            chatId={chatId}
            token={token}
            disableVoice={isPreview}
            isSending={isPreview && isCreatingPreviewChat}
            disabled={isPreview && hasPendingApprovalRequest}
            onVoiceUploadStart={createOptimisticUploadMessage}
            onVoiceUploadProgress={updateOptimisticUploadProgress}
            onVoiceUploadError={markOptimisticUploadFailed}
            onVoiceUploadComplete={settleOptimisticUpload}
          />
        </div>
      )}
      {!interlocutorDeleted && isBlockedByMe && (
        <div className="p-4 border-t border-border">
          <button
            onClick={handleUnblockFromChat}
            disabled={isUnblockingUser}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isUnblockingUser && <Loader2 className="h-4 w-4 animate-spin" />}
            {translations.unblock || 'Unblock'}
          </button>
        </div>
      )}
      {interlocutorDeleted && !isPreview && (
        <div className="p-4 border-t border-border">
          <button onClick={handleDeleteChat} className="w-full p-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
            Delete Chat
          </button>
        </div>
      )}
      {contextMenu && userId !== null && (
        <ContextMenu
          key={`context-${contextMenu.messageId}`}
          ref={contextMenuRef}
          contextMenu={contextMenu}
          messages={messages}
          token={token}
          chatId={chatId}
          userId={userId}
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
          onForward={setForwardMessage}
          onDeleteForMe={(messageId) => {
            console.log('Chat: onDeleteForMe callback called with messageId:', messageId);
            return deleteMessageForMe(messageId).unwrap();
          }}
        />
      )}
      {reactionMenu && userId !== null && (
        <ReactionMenu
          key={`reaction-${reactionMenu.message.id}`}
          ref={reactionMenuRef}
          reactionMenu={reactionMenu}
          wsRef={wsRef}
          userId={userId}
          setReactionMenu={setReactionMenu}
          onClose={closeMenus}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
        />
      )}
      <MessageSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        messages={messages}
        getMessageTime={getMessageTime}
        onJumpToMessage={jumpToSearchResult}
      />
      <ForwardMessageDialog
        open={!!forwardMessage}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
        message={forwardMessage}
        username={username}
        onForwarded={() => setModal({ type: 'copy', message: translations.messageForwarded || 'Message forwarded' })}
      />
      <Modal modal={modal} onClose={() => setModal(null)} />
    </div>
  );

  return content;
};

export default Chat;
