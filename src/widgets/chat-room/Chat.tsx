import { apiUrl } from '@/shared/api/apiUrl';
import type { Id } from '@/shared/lib/ids';
import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/entities/message';
import ChatHeader from './ui/ChatHeader';
import { MessageList } from '@/features/message-list';
import { MessageInput } from '@/features/message-composer';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { authFetch, useAccessToken } from '@/shared/auth/session';
import { usePreviewChat } from './model/usePreviewChat';
import { useChatRoomState } from './model/useChatRoomState';
import { useChatInteractions } from './model/useChatInteractions';
import { ChatProps } from './model/types';
import ChatOverlays from './ui/ChatOverlays';
import ChatUnblockButton from './ui/ChatUnblockButton';
import { useGetBlockedUsersQuery } from '@/entities/user';
import { isServerId } from '@/shared/lib/ids';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export type { ChatProps } from './model/types';

const Chat: React.FC<ChatProps> = ({ chatId, chatName, chatDisplayName, interlocutorIsOnline, interlocutorLastSeen, interlocutorAvatarUrl, username, interlocutorDeleted, firstUnreadMessageId, onBack, setIsUserProfileOpen, onOpenUserProfile, searchRequestKey = 0, messageJumpRequest = null, directDraftDisabled = false, directDraftReason = null, initialPendingApprovalRequest = false, initialPendingApprovalMessage = '', onChatCreated }) => {
  const token = useAccessToken() || '';
  const { translations } = useLanguage();
  const [userId, setUserId] = useState<Id | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<Id | null>(null);
  const [presence, setPresence] = useState({
    is_online: !!interlocutorIsOnline,
    last_seen: interlocutorLastSeen || null,
  });

  const isPreview = !isServerId(chatId);

  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const isBlockedByMe = !!blockedUsersData?.users?.some((blockedUser) => blockedUser.username.toLowerCase() === chatName.toLowerCase());

  const {
    previewMessageInput,
    setPreviewMessageInput,
    previewFailedMessages,
    isCreatingPreviewChat,
    hasPendingApprovalRequest,
    previewModal,
    setPreviewModal,
    handleSendMessagePreview,
    handleFileUploadPreview,
  } = usePreviewChat({
    chatId,
    chatName,
    username,
    userId,
    directDraftDisabled,
    directDraftReason,
    translations,
    initialPendingApprovalRequest,
    initialPendingApprovalMessage,
    onChatCreated,
  });

  const {
    messages, messageInput, setMessageInput, contextMenu, setContextMenu, replyTo, setReplyTo,
    editingMessage, setEditingMessage, setSelectedUser, modal, setModal,
    highlightedMessageId, isLoadingInitialMessages, isLoadingOlderMessages, isLoadingNewerMessages,
    hasMoreMessages, hasMoreNewerMessages, scrollToMessage, loadOlderMessages, loadNewerMessages, loadLatestMessages,
    markMessagesRead, handleSendMessage, handleResendMessage, handleFileUpload,
    createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed,
    settleOptimisticUpload, handleDeleteChat, getFormattedDateLabel, getMessageTime,
    renderMessageContent, wsRef,
  } = useChatRoomState({
    isPreview, chatId, username, token, onBack, userId: userId || '', firstUnreadMessageId,
    previewModal,
    setPreviewModal,
    onPresenceUpdate: (update) => {
      if (update.username === chatName) setPresence({ is_online: update.is_online, last_seen: update.last_seen });
    },
  });



  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
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
        const response = await authFetch(apiUrl('/me'));
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

  const {
    handleMessageClick,
    onOpenReactionMenu,
    onOpenProfile,
    interlocutorAvatar,
    jumpToSearchResult,
    onScrollStart,
  } = useChatInteractions({
    chatName, username, userId, interlocutorDeleted, interlocutorAvatarUrl, messages,
    contextMenu, setContextMenu, reactionMenu, setReactionMenu, setIsClosing,
    closeMenus, messageRefs, onOpenUserProfile, setIsUserProfileOpen, scrollToMessage,
    setTempHighlightedMessageId,
  });

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
          userId={userId || ''}
          wsRef={wsRef}
          onOpenReactionMenu={onOpenReactionMenu}
          tempHighlightedMessageId={tempHighlightedMessageId}
          setTempHighlightedMessageId={setTempHighlightedMessageId}
          onLoadOlderMessages={loadOlderMessages}
          onLoadNewerMessages={loadNewerMessages}
          onLoadLatestMessages={loadLatestMessages}
          hasMoreMessages={hasMoreMessages}
          hasMoreNewerMessages={hasMoreNewerMessages}
          isLoadingInitialMessages={isLoadingInitialMessages}
          isLoadingOlderMessages={isLoadingOlderMessages}
          isLoadingNewerMessages={isLoadingNewerMessages}
          onMarkMessagesRead={markMessagesRead}
          onResendMessage={!isPreview ? handleResendMessage : undefined}
          scrollToBottomKey={chatId}
          onScrollStart={onScrollStart}
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
        <ChatUnblockButton username={chatName} onError={(message) => setModal({ type: 'error', message })} />
      )}
      {interlocutorDeleted && !isPreview && (
        <div className="p-4 border-t border-border">
          <button onClick={handleDeleteChat} className="w-full p-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
            Delete Chat
          </button>
        </div>
      )}
      <ChatOverlays
        contextMenu={contextMenu}
        reactionMenu={reactionMenu}
        contextMenuRef={contextMenuRef}
        reactionMenuRef={reactionMenuRef}
        messageInputRef={messageInputRef}
        messages={messages}
        token={token}
        chatId={chatId}
        userId={userId}
        isClosing={isClosing}
        wsRef={wsRef}
        setContextMenu={setContextMenu}
        setReactionMenu={setReactionMenu}
        setEditingMessage={setEditingMessage}
        setMessageInput={setMessageInput}
        setReplyTo={setReplyTo}
        setModal={setModal}
        closeMenus={closeMenus}
        onForward={setForwardMessage}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        getMessageTime={getMessageTime}
        jumpToSearchResult={jumpToSearchResult}
        forwardMessage={forwardMessage}
        username={username}
        onForwarded={() => setModal({ type: 'copy', message: translations.messageForwarded || 'Message forwarded' })}
        modal={modal}
      />

    </div>
  );

  return content;
};

export default Chat;
