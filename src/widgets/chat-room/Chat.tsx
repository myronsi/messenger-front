import type { EntityId } from '@/shared/api/entityId';
import { isPersistedId } from '@/shared/api/entityId';
import React, { useRef, useState, useEffect } from 'react';
import { ChatHeaderSearch, Message } from '@/entities/message';
import ChatHeader from './ui/ChatHeader';
import { MessageList } from '@/features/message-list';
import { ImageDrawingProvider } from '@/features/image-drawing';
import { MessageComposer } from '@/features/message-composer';
import { useStableCallback } from '@/shared/lib/useStableCallback';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAccessToken } from '@/shared/auth/session';
import { usePreviewChat } from './model/usePreviewChat';
import { usePreviewHandoff } from './model/usePreviewHandoff';
import { useChatRoomState } from './model/useChatRoomState';
import { useChatInteractions } from './model/useChatInteractions';
import { ChatProps } from './model/types';
import ChatOverlays from './ui/ChatOverlays';
import { useMessageSelection, useReplyAction } from '@/features/message-actions';
import { useBackToClose } from '@/shared/lib/useBackToClose';
import ChatUnblockButton from './ui/ChatUnblockButton';
import { useElementHeight } from '@/shared/lib/useElementHeight';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetBlockedUsersQuery } from '@/entities/user';

export type { ChatProps } from './model/types';

const Chat: React.FC<ChatProps> = ({ chatId, chatName, chatDisplayName, interlocutorIsOnline, interlocutorLastSeen, interlocutorAvatarUrl, username, interlocutorDeleted, firstUnreadMessageId, onBack, setIsUserProfileOpen, onOpenUserProfile, searchRequestKey = 0, messageJumpRequest = null, directDraftDisabled = false, directDraftReason = null, initialPendingApprovalRequest = false, initialPendingApprovalMessage = '', onChatCreated }) => {
  const token = useAccessToken() || '';
  const { translations } = useLanguage();
  const { data: me } = useGetCurrentUserQuery(undefined, { skip: !token });
  const userId = me?.id ?? null;
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<EntityId | null>(null);
  const [presence, setPresence] = useState({
    is_online: !!interlocutorIsOnline,
    last_seen: interlocutorLastSeen || null,
  });

  const isPreview = !isPersistedId(chatId);

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
    clearPreviewMessages,
    handleSendMessagePreview,
    handleFileUploadPreview,
  } = usePreviewChat({
    chatId,
    chatName,
    chatDisplayName,
    avatarUrl: interlocutorAvatarUrl,
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
    messages, composerDraftRef, setMessageInput, contextMenu, setContextMenu, replyTo, setReplyTo,
    editingMessage, setEditingMessage, setSelectedUser, modal, setModal,
    highlightedMessageId, isLoadingInitialMessages, isLoadingOlderMessages, isLoadingNewerMessages,
    hasMoreMessages, hasMoreNewerMessages, scrollToMessage, loadOlderMessages, loadNewerMessages, loadLatestMessages,
    markMessagesRead, handleSendMessage, handleSendSticker, handleResendMessage, handleFileUpload,
    createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed,
    settleOptimisticUpload, handleDeleteChat, getFormattedDateLabel, getMessageTime,
    renderMessageContent, wsRef,
  } = useChatRoomState({
    isPreview, chatId, username, token, onBack, userId: userId || 0, firstUnreadMessageId,
    previewModal,
    setPreviewModal,
    onPresenceUpdate: (update) => {
      if (update.username === chatName) setPresence({ is_online: update.is_online, last_seen: update.last_seen });
    },
  });



  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [composerRef, composerHeight] = useElementHeight<HTMLDivElement>();
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

  usePreviewHandoff({
    isPreview, isLoadingHistory: isLoadingInitialMessages, messageCount: messages.length,
    previewCount: previewFailedMessages.length, clearPreviewMessages,
  });

  const displayedMessages = isPreview || (!messages.length && previewFailedMessages.length) ? previewFailedMessages : messages;
  const { selection, start: startSelection, clear: clearSelection, intercept } = useMessageSelection(chatId, displayedMessages);
  useBackToClose(selection.active, clearSelection, 'selection');
  useBackToClose(isSearchOpen, () => setIsSearchOpen(false), 'search');
  const startReply = useReplyAction({ editingMessage, setReplyTo, setEditingMessage, setMessageInput, messageInputRef });
  const onListMessageClick = useStableCallback(isPreview ? handleMessageClick : intercept(handleMessageClick));
  const onAvatarClick = useStableCallback((profileUsername: string) => {
    if (onOpenUserProfile) onOpenUserProfile(profileUsername);
    else setSelectedUser(profileUsername);
  });
  const onListReactionMenu = useStableCallback(onOpenReactionMenu);
  const onListScrollStart = useStableCallback(onScrollStart);
  const onListReplyClick = useStableCallback(scrollToMessage);
  const onListResend = useStableCallback(handleResendMessage);
  const formatDate = useStableCallback(getFormattedDateLabel);
  const formatTime = useStableCallback(getMessageTime);
  const renderContent = useStableCallback(renderMessageContent);

  const content = (
    <div data-chat-drop-zone data-chat-id={String(chatId)} className="relative flex h-full flex-col overflow-hidden">
      {isSearchOpen ? <ChatHeaderSearch chatId={chatId} onClose={() => setIsSearchOpen(false)} onJumpToMessage={jumpToSearchResult} /> : (<ChatHeader
        chatId={chatId}
        chatName={chatName}
        chatDisplayName={chatDisplayName}
        isOnline={presence.is_online}
        lastSeen={presence.last_seen}
        interlocutorDeleted={interlocutorDeleted}
        onBack={onBack}
        onDeleteChat={handleDeleteChat}
        onOpenProfile={onOpenProfile}
        onOpenSearch={!isPreview && !interlocutorDeleted ? () => setIsSearchOpen(true) : undefined}
        interlocutorAvatar={interlocutorAvatar}
      />)}
      <ImageDrawingProvider chatId={chatId} enabled={!isPreview} onSent={settleOptimisticUpload}>
      <MessageList
          ref={chatWindowRef}
          chatId={chatId}
          messages={displayedMessages}
          username={username}
          interlocutorDeleted={interlocutorDeleted}
          firstUnreadMessageId={firstUnreadMessageId}
          onMessageClick={onListMessageClick}
          onAvatarClick={onAvatarClick}
          highlightedMessageId={highlightedMessageId}
          contextMenuMessageId={contextMenu?.messageId}
          composerTargetMessageId={(editingMessage || replyTo)?.id}
          bottomInset={composerHeight}
          getFormattedDateLabel={formatDate}
          getMessageTime={formatTime}
          renderMessageContent={renderContent}
          messageRefs={messageRefs}
          onReplyClick={onListReplyClick}
          userId={userId || 0}
          wsRef={wsRef}
          onOpenReactionMenu={onListReactionMenu}
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
          onResendMessage={!isPreview ? onListResend : undefined}
          scrollToBottomKey={chatId}
          onScrollStart={onListScrollStart}
          selection={isPreview ? undefined : selection}
          onSwipeReply={isPreview ? undefined : startReply}
        />
      </ImageDrawingProvider>
      {!interlocutorDeleted && !isBlockedByMe && (
        <div ref={composerRef} className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 motion-composer ${selection.active || isSearchOpen ? 'is-hidden' : ''}`}>
          <MessageComposer
            ref={messageInputRef}
            draftRef={composerDraftRef}
            messageInput={isPreview ? previewMessageInput : undefined}
            setMessageInput={isPreview ? setPreviewMessageInput : undefined}
            replyTo={replyTo}
            editingMessage={editingMessage}
            onSendMessage={isPreview ? handleSendMessagePreview : handleSendMessage}
            onSendSticker={isPreview ? undefined : handleSendSticker}
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
        setReplyTo={setReplyTo} onReply={startReply}
        setModal={setModal}
        closeMenus={closeMenus}
        onForward={setForwardMessage}
        forwardMessage={forwardMessage}
        username={username}
        modal={modal}
        selection={selection} onSelect={isPreview ? undefined : startSelection} onClearSelection={clearSelection}
      />

    </div>
  );

  return content;
};

export default Chat;
