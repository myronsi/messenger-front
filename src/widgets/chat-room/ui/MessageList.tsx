import React, { forwardRef, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useMessageListScroll } from '../model/useMessageListScroll';
import { useMessageReadReceipts } from '../model/useMessageReadReceipts';
import MessageItem from './MessageItem';
import ScrollToBottomButton from './ScrollToBottomButton';
import { Message, ReactionInfo } from '@/entities/message';
import { useFileTypes } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useStableCallback } from '@/shared/lib/useStableCallback';

interface MessageListProps {
  messages: Message[];
  username: string;
  userId: number;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: number | null;
  onMessageClick: (e: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  highlightedMessageId: number | null;
  contextMenuMessageId?: number;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  renderMessageContent: (message: Message) => React.ReactNode;
  messageRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onReplyClick: (messageId: number) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onOpenReactionMenu: (message: Message, e: React.MouseEvent) => void;
  tempHighlightedMessageId: number | null;
  setTempHighlightedMessageId: (id: number | null) => void;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadLatestMessages?: () => Promise<void>;
  hasMoreMessages?: boolean;
  hasMoreNewerMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingNewerMessages?: boolean;
  isLoadingInitialMessages?: boolean;
  onMarkMessagesRead?: (messageIds: number[]) => Promise<void>;
  isGroup?: boolean;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
  scrollToBottomKey?: string | number;
  onScrollStart?: () => void;
}

const MESSAGE_LIST_BOTTOM_SPACE = 'pb-32 md:pb-36';

const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  const {
    messages,
    username,
    userId,
    interlocutorDeleted,
    firstUnreadMessageId,
    onMessageClick,
    onAvatarClick,
    highlightedMessageId,
    contextMenuMessageId,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    messageRefs,
    onReplyClick,
    wsRef,
    tempHighlightedMessageId,
    setTempHighlightedMessageId,
    onLoadOlderMessages,
    onLoadNewerMessages,
    onLoadLatestMessages,
    hasMoreMessages = false,
    hasMoreNewerMessages = false,
    isLoadingOlderMessages = false,
    isLoadingNewerMessages = false,
    isLoadingInitialMessages = false,
  } = props;

  const { getFileTypeConfig } = useFileTypes();
  const { translations } = useLanguage();
  const isGroup = props.isGroup || false;
  const onOpenReadStatus = props.onOpenReadStatus;
  const onOpenReactionDetails = props.onOpenReactionDetails;
  const onResendMessage = props.onResendMessage;
  const scrollToBottomKey = props.scrollToBottomKey;
  const onScrollStart = props.onScrollStart;
  const onMarkMessagesRead = props.onMarkMessagesRead;

  const isOwnMessage = useCallback((message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  }, [userId, username]);

  const latchedBoundaryRef = useRef<{ key: string | number | undefined; id: number | null }>({ key: scrollToBottomKey, id: null });
  if (latchedBoundaryRef.current.key !== scrollToBottomKey) latchedBoundaryRef.current = { key: scrollToBottomKey, id: null };

  // Latched per chat so the separator doesn't jump as messages become read.
  const visibleUnreadBoundaryId = (() => {
    if (latchedBoundaryRef.current.id !== null) return latchedBoundaryRef.current.id;
    if (!firstUnreadMessageId) return null;
    const boundaryIndex = messages.findIndex((message) => message.id === firstUnreadMessageId);
    if (boundaryIndex === -1) return firstUnreadMessageId;
    const firstUnreadMessage = messages.slice(boundaryIndex).find((message) => (
      !isOwnMessage(message) &&
      !(userId > 0 && message.read_by?.some((reader) => reader.user_id === userId))
    ));
    if (firstUnreadMessage) latchedBoundaryRef.current.id = firstUnreadMessage.id;
    return firstUnreadMessage?.id ?? null;
  })();

  const {
    currentDate,
    isScrolling,
    chatContainerRef,
    contentRef,
    firstUnreadMarkerRef,
    isPositioned,
    unseenCount,
    showScrollToBottom,
    scrollToBottom,
  } = useMessageListScroll({
    messages, messageRefs, firstUnreadMessageId: visibleUnreadBoundaryId, highlightedMessageId, tempHighlightedMessageId,
    getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingInitialMessages,
    isLoadingOlderMessages, isLoadingNewerMessages, onLoadOlderMessages, onLoadNewerMessages, onLoadLatestMessages,
    onScrollStart, scrollToBottomKey, isOwnMessage,
  });

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref, contentRef]);

  const observerRef = useMessageReadReceipts({
    messages, username, userId, messageRefs, chatContainerRef, isOwnMessage,
    onMarkMessagesRead, enabled: isPositioned,
  });

  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parents recreate these callbacks on every render; stable proxies keep memoized items from re-rendering.
  const stableGetFormattedDateLabel = useStableCallback(getFormattedDateLabel);
  const stableGetMessageTime = useStableCallback(getMessageTime);
  const stableRenderMessageContent = useStableCallback(renderMessageContent);
  const stableGetFileTypeConfig = useStableCallback(getFileTypeConfig);
  const stableOnMessageClick = useStableCallback(onMessageClick);
  const stableOnAvatarClick = useStableCallback(onAvatarClick);
  const stableOnReplyClick = useStableCallback(onReplyClick);
  const stableSetTempHighlightedMessageId = useStableCallback(setTempHighlightedMessageId);
  const stableOnOpenReadStatus = useStableCallback((message: Message) => onOpenReadStatus?.(message));
  const stableOnOpenReactionDetails = useStableCallback(
    (message: Message, reaction: string, reactions: ReactionInfo[]) => onOpenReactionDetails?.(message, reaction, reactions)
  );
  const stableOnResendMessage = useStableCallback((message: Message) => onResendMessage?.(message));
  const hasResendHandler = !!onResendMessage;

  const messagesById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  const handleMessageClick = useStableCallback((e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    if (message.reply_to && e.type === 'click' && !interlocutorDeleted) {
      onReplyClick(message.reply_to);
      const originalMessage = messageRefs.current[message.reply_to];
      if (originalMessage) {
        originalMessage.scrollIntoView({ behavior: 'smooth' });
        setTempHighlightedMessageId(message.reply_to);
        setTimeout(() => {
          setTempHighlightedMessageId(null);
        }, 2000);
      }
    } else {
      onMessageClick(e, message);
    }
  });

  return (
    <div className="relative min-h-0 flex-1">
    <div className="absolute inset-0 overflow-y-auto overflow-anchor-none" ref={chatContainerRef}>
      {currentDate && (
        <div className="sticky pt-0.5 top-0 z-50 flex justify-center pointer-events-none md:w-2/3 md:mx-auto md:px-0">
          <div
            className={`px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground transition-opacity duration-300 ${
              isScrolling ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {currentDate}
          </div>
        </div>
      )}
      <div ref={setContentRef} className={`px-[10px] pt-6 md:w-2/3 md:mx-auto md:px-0 space-y-4 ${MESSAGE_LIST_BOTTOM_SPACE}`}>
        {isLoadingOlderMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
        {!isLoadingInitialMessages && messages.length === 0 && (
          <div className="flex h-[55vh] items-center justify-center text-sm text-muted-foreground">
            {translations.noMessagesYet || 'No messages yet'}
          </div>
        )}
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
          const fileConfig = message.type === 'file' && typeof message.content !== 'string'
            ? getFileTypeConfig(message.content.file_name)
            : undefined;
          return (
            <MessageItem
              key={message.client_temp_id ?? message.id}
              message={message}
              prevMessage={prevMessage}
              nextMessage={nextMessage}
              replyMessage={message.reply_to ? messagesById.get(message.reply_to) : undefined}
              userId={userId}
              isGroup={isGroup}
              isImage={fileConfig?.replyText === translations.image}
              isMobile={isMobile}
              showNewMessagesMarker={visibleUnreadBoundaryId === message.id && !isOwnMessage(message)}
              nextShowsNewMessagesMarker={!!nextMessage && visibleUnreadBoundaryId === nextMessage.id && !isOwnMessage(nextMessage)}
              translations={translations}
              interlocutorDeleted={interlocutorDeleted}
              isHighlighted={highlightedMessageId === message.id}
              isContextHighlighted={contextMenuMessageId === message.id || tempHighlightedMessageId === message.id}
              messageRefs={messageRefs}
              observerRef={observerRef}
              firstUnreadMarkerRef={firstUnreadMarkerRef}
              getFormattedDateLabel={stableGetFormattedDateLabel}
              getMessageTime={stableGetMessageTime}
              isOwnMessage={isOwnMessage}
              getFileTypeConfig={stableGetFileTypeConfig}
              renderMessageContent={stableRenderMessageContent}
              isAudioPlaying={playingMessageId === message.id}
              setPlayingMessageId={setPlayingMessageId}
              onMessageClick={stableOnMessageClick}
              onClick={handleMessageClick}
              onAvatarClick={stableOnAvatarClick}
              onReplyClick={stableOnReplyClick}
              setTempHighlightedMessageId={stableSetTempHighlightedMessageId}
              wsRef={wsRef}
              onOpenReadStatus={stableOnOpenReadStatus}
              onOpenReactionDetails={stableOnOpenReactionDetails}
              onResendMessage={hasResendHandler ? stableOnResendMessage : undefined}
            />
          );
        })}
        {isLoadingNewerMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
      </div>
    </div>
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 ${MESSAGE_LIST_BOTTOM_SPACE}`}>
      <div className="flex justify-end px-4 md:mx-auto md:w-2/3 md:px-0">
        <ScrollToBottomButton
          visible={showScrollToBottom}
          count={unseenCount}
          label={translations.moveDown || 'Move down'}
          countLabel={(translations.moveDownNewMessages || 'Move down, {count} new messages').replace('{count}', String(unseenCount))}
          onClick={scrollToBottom}
        />
      </div>
    </div>
    </div>
  );
});

export default MessageList;
