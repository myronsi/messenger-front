import React, { forwardRef, useState, useEffect } from 'react';
import { useMessageListScroll } from '../model/useMessageListScroll';
import { useMessageReadReceipts } from '../model/useMessageReadReceipts';
import MessageContent from './MessageContent';
import MessageItem from './MessageItem';
import { Message, ReactionInfo } from '@/entities/message';
import { getFileTypes } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';

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
    onOpenReactionMenu,
    tempHighlightedMessageId,
    setTempHighlightedMessageId,
    onLoadOlderMessages,
    onLoadNewerMessages,
    hasMoreMessages = false,
    hasMoreNewerMessages = false,
    isLoadingOlderMessages = false,
    isLoadingNewerMessages = false,
    isLoadingInitialMessages = false,
  } = props;

  const { getFileTypeConfig } = getFileTypes();
  const { translations } = useLanguage();
  const isGroup = props.isGroup || false;
  const onOpenReadStatus = props.onOpenReadStatus;
  const onOpenReactionDetails = props.onOpenReactionDetails;
  const onResendMessage = props.onResendMessage;
  const scrollToBottomKey = props.scrollToBottomKey;
  const onScrollStart = props.onScrollStart;
  const onMarkMessagesRead = props.onMarkMessagesRead;

  const {
    currentDate,
    isScrolling,
    visibleFirstUnreadId,
    setVisibleFirstUnreadId,
    chatContainerRef,
    firstUnreadMarkerRef,
  } = useMessageListScroll({
    messages, messageRefs, firstUnreadMessageId, highlightedMessageId, tempHighlightedMessageId,
    getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingInitialMessages,
    isLoadingOlderMessages, isLoadingNewerMessages, onLoadOlderMessages, onLoadNewerMessages,
    onScrollStart, scrollToBottomKey,
  });

  const isOwnMessage = (message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  };


  const observerRef = useMessageReadReceipts({
    messages, username, userId, messageRefs, chatContainerRef, isOwnMessage,
    onMarkMessagesRead,
  });

  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioStates, setAudioStates] = useState<{ [key: number]: { currentTime: number; duration: number } }>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderContent = (message: Message) => (
    <MessageContent
      message={message}
      userId={userId}
      isGroup={isGroup}
      isMobile={isMobile}
      translations={translations}
      getFileTypeConfig={getFileTypeConfig}
      isOwnMessage={isOwnMessage}
      renderMessageContent={renderMessageContent}
      playingMessageId={playingMessageId}
      setPlayingMessageId={setPlayingMessageId}
      audioStates={audioStates}
      setAudioStates={setAudioStates}
    />
  );

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
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
  };

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto overflow-anchor-none" ref={chatContainerRef}>
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
      <div ref={ref} className="px-[10px] pt-6 pb-32 md:w-2/3 md:mx-auto md:px-0 md:pb-36 space-y-4">
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
        {messages.map((message, index) => (
          <MessageItem
            key={message.client_temp_id ?? message.id}
            message={message}
            index={index}
            messages={messages}
            userId={userId}
            isGroup={isGroup}
            visibleFirstUnreadId={visibleFirstUnreadId}
            translations={translations}
            interlocutorDeleted={interlocutorDeleted}
            highlightedMessageId={highlightedMessageId}
            contextMenuMessageId={contextMenuMessageId}
            tempHighlightedMessageId={tempHighlightedMessageId}
            messageRefs={messageRefs}
            observerRef={observerRef}
            firstUnreadMarkerRef={firstUnreadMarkerRef}
            getFormattedDateLabel={getFormattedDateLabel}
            getMessageTime={getMessageTime}
            isOwnMessage={isOwnMessage}
            isImageMessage={(item) => item.type === 'file' && typeof item.content !== 'string' && getFileTypeConfig(item.content.file_name)?.replyText === translations.image}
            renderContent={renderContent}
            onMessageClick={onMessageClick}
            onClick={handleMessageClick}
            onAvatarClick={onAvatarClick}
            onReplyClick={onReplyClick}
            setTempHighlightedMessageId={setTempHighlightedMessageId}
            wsRef={wsRef}
            onOpenReadStatus={onOpenReadStatus}
            onOpenReactionDetails={onOpenReactionDetails}
            onResendMessage={onResendMessage}
          />
        ))}
        {isLoadingNewerMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageList;
