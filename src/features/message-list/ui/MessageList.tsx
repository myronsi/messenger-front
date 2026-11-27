import { useDragSelect } from '../model/useDragSelect';
import { DelayedSpinner } from '@/shared/ui/DelayedSpinner';
import type { SocketSender } from '@/shared/api/realtime';
import { isPersistedId } from '@/shared/api/entityId';
import { ChatWallpaperLayer } from '@/entities/chat-wallpaper';
import type { EntityId } from '@/shared/api/entityId';
import React, { forwardRef, memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useMessageListScroll } from '../model/useMessageListScroll';
import { bottomInsetPadding } from '../model/useBottomInset';
import { useMessageReadReceipts } from '../model/useMessageReadReceipts';
import { useMessageTap } from '../model/useMessageTap';
import { useQuietRemounts } from '../model/useQuietRemounts';
import { audioQueueFor } from '../model/audioQueue';
import { TypingBubble } from '@/entities/typing';
import ScrollToBottomButton from './ScrollToBottomButton';
import { LoadingPill } from './LoadingPill';
import { ChatGalleryContext, isVisualMediaMessage, Message, MessageChatContext, MessageItem, pendingImportIds, useChatGalleryEntries, playAudio, ReactionInfo, type MessageSelection } from '@/entities/message';
import { useFileTypes } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useChatCovered } from '@/shared/contexts/ChatCoveredContext';
import { useStableCallback } from '@/shared/lib/useStableCallback';
interface MessageListProps {
  messages: Message[];
  username: string;
  userId: EntityId;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: EntityId | null;
  onMessageClick: (e: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  highlightedMessageId: EntityId | null;
  contextMenuMessageId?: EntityId;
  composerTargetMessageId?: EntityId;
  bottomInset?: number;
  bottomInsetSource?: HTMLElement | null;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  renderMessageContent: (message: Message) => React.ReactNode;
  messageRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onReplyClick: (messageId: EntityId) => void;
  wsRef: React.MutableRefObject<SocketSender | null>;
  onOpenReactionMenu: (message: Message, e: React.MouseEvent) => void;
  tempHighlightedMessageId: EntityId | null;
  setTempHighlightedMessageId: (id: EntityId | null) => void;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadLatestMessages?: () => Promise<void>;
  onLoadMessagesAround?: (messageId: EntityId) => Promise<void>;
  hasMoreMessages?: boolean;
  hasMoreNewerMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingNewerMessages?: boolean;
  isLoadingInitialMessages?: boolean;
  onMarkMessagesRead?: (messageIds: EntityId[]) => Promise<void>;
  isGroup?: boolean;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
  scrollToBottomKey?: string | number;
  onScrollStart?: () => void;
  selection?: MessageSelection;
  onSwipeReply?: (message: Message) => void;
  chatId?: EntityId;
  bottomAction?: React.ReactNode;
}

const MESSAGE_LIST_BOTTOM_SPACE = 'pb-32 md:pb-36';

const MessageList = memo(forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  const {
    messages: allMessages,
    username,
    userId,
    interlocutorDeleted,
    firstUnreadMessageId,
    onMessageClick,
    onAvatarClick,
    highlightedMessageId,
    contextMenuMessageId,
    composerTargetMessageId,
    bottomInset,
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
    onLoadLatestMessages, onLoadMessagesAround,
    hasMoreMessages = false, hasMoreNewerMessages = false,
    isLoadingOlderMessages = false, isLoadingNewerMessages = false,
    isLoadingInitialMessages = false,
  } = props;
  const bottomSpaceClass = bottomInset === undefined ? MESSAGE_LIST_BOTTOM_SPACE : '';
  const bottomSpaceStyle = bottomInset === undefined ? undefined : { paddingBottom: bottomInsetPadding(bottomInset) };
  const { getFileTypeConfig } = useFileTypes();
  const { translations } = useLanguage();
  const isGroup = props.isGroup || false;
  const onOpenReadStatus = props.onOpenReadStatus;
  const onOpenReactionDetails = props.onOpenReactionDetails;
  const { onResendMessage, scrollToBottomKey, onScrollStart } = props;
  const onMarkMessagesRead = props.onMarkMessagesRead;
  const isOwnMessage = useCallback((message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  }, [userId, username]);

  const latchedBoundaryRef = useRef<{ key: string | number | undefined; id: EntityId | null }>({ key: scrollToBottomKey, id: null });
  if (latchedBoundaryRef.current.key !== scrollToBottomKey) latchedBoundaryRef.current = { key: scrollToBottomKey, id: null };

  const messages = useMemo(() => allMessages.filter((message) => !message.is_deleted || message.is_deleting || message.removed_by_moderation), [allMessages]);
  // Latched per chat so the separator doesn't jump as messages become read.
  const visibleUnreadBoundaryId = (() => {
    if (latchedBoundaryRef.current.id !== null) return latchedBoundaryRef.current.id;
    if (!firstUnreadMessageId) return null;
    const boundaryIndex = messages.findIndex((message) => message.id === firstUnreadMessageId);
    if (boundaryIndex === -1) return firstUnreadMessageId;
    const firstUnreadMessage = messages.slice(boundaryIndex).find((message) => (
      !isOwnMessage(message) &&
      !(isPersistedId(userId) && message.read_by?.some((reader) => reader.user_id === userId))
    ));
    if (firstUnreadMessage) latchedBoundaryRef.current.id = firstUnreadMessage.id;
    return firstUnreadMessage?.id ?? null;
  })();

  const {
    currentDate, dateBadgeRef,
    isScrolling,
    chatContainerRef,
    contentRef,
    firstUnreadMarkerRef,
    isPositioned,
    unseenCount,
    showScrollToBottom,
    scrollToBottom,
    messageWindow,
  } = useMessageListScroll({
    messages, messageRefs, firstUnreadMessageId: visibleUnreadBoundaryId, highlightedMessageId, tempHighlightedMessageId,
    getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingInitialMessages,
    isLoadingOlderMessages, isLoadingNewerMessages, onLoadOlderMessages, onLoadNewerMessages, onLoadLatestMessages,
    onLoadMessagesAround, onScrollStart, scrollToBottomKey, isOwnMessage, bottomInsetSource: props.bottomInsetSource,
  });

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref, contentRef]);

  useQuietRemounts(messages, messageRefs, messageWindow.renderKey, scrollToBottomKey);
  useMessageReadReceipts({
    messages, userId, messageRefs, chatContainerRef, isOwnMessage,
    onMarkMessagesRead, enabled: !useChatCovered() && isPositioned, renderKey: messageWindow.renderKey,
  });

  const onPlayAudio = useStableCallback((id: EntityId, startAt?: number) => {
    const queue = audioQueueFor(messages, id, translations.voiceMessage, props.chatId !== undefined && isPersistedId(props.chatId) ? props.chatId : undefined);
    if (queue) playAudio(queue.track, queue.upcoming, startAt);
  });
  const gallery = useChatGalleryEntries(props.chatId, messages.some((message) => message.type === 'file'));
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

  const pendingImports = useMemo(() => pendingImportIds(messages), [messages]);
  const messagesById = useMemo(() => new Map(allMessages.map((message) => [message.id, message])), [allMessages]);

  const lastScrollAtRef = useRef(0);
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return undefined;
    const onScroll = () => { lastScrollAtRef.current = Date.now(); };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [chatContainerRef]);

  const onLongPressSelect = useDragSelect({ containerRef: chatContainerRef, messages, selection: props.selection });
  const handleMessageClick = useMessageTap({
    onMessageClick, userId, wsRef, lastScrollAtRef, canReact: !interlocutorDeleted && !props.selection?.active, menuOpen: contextMenuMessageId !== undefined,
  });

  return (
    <MessageChatContext.Provider value={props.chatId}><ChatGalleryContext.Provider value={gallery}><div className="chat-surface relative min-h-0 flex-1">
    <ChatWallpaperLayer chatId={props.chatId !== undefined && isPersistedId(props.chatId) ? props.chatId : undefined} />
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overflow-anchor-none" ref={chatContainerRef}>
      {currentDate && (
        <div data-testid="sticky-date" className="sticky top-[var(--pinned-inset,0px)] z-20 flex h-0 justify-center overflow-visible pointer-events-none md:w-2/3 md:mx-auto md:px-0">
          <div ref={dateBadgeRef} aria-hidden="true"
            className={`mt-0.5 h-fit px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground transition-opacity duration-300 will-change-transform ${
              isScrolling ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {currentDate}
          </div>
        </div>
      )}
      <div ref={setContentRef} className={`px-[10px] pt-[calc(1.5rem+var(--pinned-inset,0px))] md:w-2/3 md:mx-auto md:px-0 space-y-[var(--chat-gap)] ${bottomSpaceClass}`} style={bottomSpaceStyle}>
        {isLoadingOlderMessages && <LoadingPill label={translations.loading} />}
        {messages.length === 0 && (isLoadingInitialMessages ? <DelayedSpinner label={translations.loading} className="h-[55vh]" /> : (
          <div className="flex h-[55vh] items-center justify-center text-sm text-muted-foreground">{translations.noMessagesYet || 'No messages yet'}</div>
        ))}
        {messageWindow.topSpace > 0 && <div aria-hidden="true" data-message-spacer="top" style={{ height: messageWindow.topSpace }} />}
        {messages.slice(messageWindow.start, messageWindow.end).map((message, offset) => {
          const index = messageWindow.start + offset;
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
              replyMessage={message.reply_to ? messagesById.get(message.reply_to) ?? message.reply_preview : undefined}
              userId={userId}
              isGroup={isGroup}
              showImportedName={!!message.import && pendingImports.has(String(message.import.import_id))}
              isImage={fileConfig?.replyText === translations.image || isVisualMediaMessage(message)}
              isMobile={isMobile}
              showNewMessagesMarker={visibleUnreadBoundaryId === message.id && !isOwnMessage(message)}
              nextShowsNewMessagesMarker={!!nextMessage && visibleUnreadBoundaryId === nextMessage.id && !isOwnMessage(nextMessage)}
              translations={translations}
              interlocutorDeleted={interlocutorDeleted}
              isHighlighted={highlightedMessageId === message.id}
              isContextHighlighted={contextMenuMessageId === message.id || tempHighlightedMessageId === message.id || composerTargetMessageId === message.id}
              messageRefs={messageRefs}
              firstUnreadMarkerRef={firstUnreadMarkerRef}
              getFormattedDateLabel={stableGetFormattedDateLabel}
              getMessageTime={stableGetMessageTime}
              isOwnMessage={isOwnMessage}
              getFileTypeConfig={stableGetFileTypeConfig}
              renderMessageContent={stableRenderMessageContent}
              onPlayAudio={onPlayAudio}
              onMessageClick={stableOnMessageClick}
              onClick={handleMessageClick}
              isSelected={!!props.selection?.ids.has(message.id)}
              onToggleSelect={props.selection?.active ? props.selection.toggle : undefined}
              onLongPress={onLongPressSelect}
              onSwipeReply={props.onSwipeReply}
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
        {messageWindow.bottomSpace > 0 && <div aria-hidden="true" data-message-spacer="bottom" style={{ height: messageWindow.bottomSpace }} />}
        {props.chatId !== undefined && !hasMoreNewerMessages && <TypingBubble chatId={props.chatId} isGroup={isGroup} />}
        {isLoadingNewerMessages && <LoadingPill label={translations.loading} />}
      </div>
    </div>
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 ${bottomSpaceClass}`} style={bottomSpaceStyle}>
      <div className="flex flex-col items-end gap-2 px-4 md:mx-auto md:w-2/3 md:px-0">
        {props.bottomAction}
        <ScrollToBottomButton
          visible={showScrollToBottom}
          count={unseenCount}
          label={translations.moveDown || 'Move down'}
          countLabel={(translations.moveDownNewMessages || 'Move down, {count} new messages').replace('{count}', String(unseenCount))}
          onClick={scrollToBottom}
        />
      </div>
    </div>
    </div></ChatGalleryContext.Provider></MessageChatContext.Provider>
  );
}));

export default MessageList;
