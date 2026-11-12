import type { SocketSender } from '@/shared/api/realtime';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { MutableRefObject, memo, useCallback, useMemo, useState } from 'react';
import { useLongPress } from '@/shared/lib/useLongPress';
import { combineTouchHandlers, useSwipeAction } from '@/shared/lib/useSwipeAction';
import SwipeReplyIcon from './SwipeReplyIcon';
import SystemMessageLine from './SystemMessageLine';
import DateSeparator from './DateSeparator';
import { Message, ReactionInfo } from '../model/types';
import { isValidTimestamp } from '../model/messageListScrollUtils';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';
import MessageContent from './MessageContent';
import ForwardedLabel from './ForwardedLabel';
import MessageTime from './MessageTime';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { prefersReducedMotion } from '../model/messageDeletion';
import { bubbleClass } from '../model/bubbleClass';
import { AlertCircle, Check } from 'lucide-react';
const PARTICLE_COUNT = 36;

const DissolveParticles: React.FC = () => {
  const particles = React.useMemo(() => Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    dx: 20 + Math.random() * 50,
    dy: -30 + Math.random() * 60,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 250,
  })), []);
  return (
    <div className="message-particles" aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={index}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            animationDelay: `${particle.delay}ms`,
            '--dx': `${particle.dx}px`,
            '--dy': `${particle.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Only primitives, the message itself and stable callbacks are passed so React.memo can skip
// every item that did not change when a new message, reaction or typing event arrives.
interface MessageItemProps {
  message: Message;
  prevMessage: Message | null;
  nextMessage: Message | null;
  replyMessage?: Message;
  userId: EntityId;
  isGroup: boolean;
  isImage: boolean;
  isMobile: boolean;
  showNewMessagesMarker: boolean;
  nextShowsNewMessagesMarker: boolean;
  translations: Translations;
  interlocutorDeleted: boolean;
  isHighlighted: boolean;
  isContextHighlighted: boolean;
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  firstUnreadMarkerRef: MutableRefObject<HTMLDivElement | null>;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  isOwnMessage: (message: Message) => boolean;
  getFileTypeConfig: (fileName: string) => FileTypeConfig | undefined;
  renderMessageContent: (message: Message) => React.ReactNode;
  isAudioPlaying: boolean;
  setPlayingMessageId: (id: EntityId | null, endedId?: EntityId) => void;
  onMessageClick: (event: React.MouseEvent, message: Message) => void;
  onClick: (event: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  onReplyClick: (messageId: EntityId) => void;
  setTempHighlightedMessageId: (id: EntityId | null) => void;
  wsRef: MutableRefObject<SocketSender | null>;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
  isSelected?: boolean;
  onToggleSelect?: (message: Message, extend?: boolean) => void;
  onLongPress?: (message: Message) => void;
  onSwipeReply?: (message: Message) => void;
}
const MessageItem: React.FC<MessageItemProps> = ({
  message, prevMessage, nextMessage, replyMessage, userId, isGroup, isImage: isImageMessage, isMobile, showNewMessagesMarker,
  nextShowsNewMessagesMarker, translations, interlocutorDeleted, isHighlighted, isContextHighlighted, messageRefs,
  firstUnreadMarkerRef, getFormattedDateLabel, getMessageTime, isOwnMessage, getFileTypeConfig,
  renderMessageContent, isAudioPlaying, setPlayingMessageId,
  onMessageClick, onClick, onAvatarClick, onReplyClick,
  setTempHighlightedMessageId, wsRef, onOpenReadStatus, onOpenReactionDetails, onResendMessage, isSelected = false, onToggleSelect, onLongPress, onSwipeReply,
}) => {
  const messageId = message.id;
  const setRowRef = useCallback((element: HTMLDivElement | null) => { messageRefs.current[messageId] = element; }, [messageRefs, messageId]);
  const longPress = useLongPress(onLongPress && !onToggleSelect ? () => onLongPress(message) : undefined);
  const isMine = isOwnMessage(message);
  const mediaKey = message.sticker?.image_url ?? (typeof message.content === 'string' ? '' : message.content?.file_url ?? '');
  const [brokenMedia, setBrokenMedia] = useState<string | null>(null), mediaBroken = brokenMedia === mediaKey;
  const isSticker = !!message.sticker && !message.is_deleted && !mediaBroken;
  const isImage = (isImageMessage || isSticker) && !mediaBroken, tinted = isMine && !isSticker;
  const canSwipe = !!onSwipeReply && !onToggleSelect && isPersistedId(message.id) && !message.is_deleted && !interlocutorDeleted;
  const swipe = useSwipeAction(isMine ? -1 : 1, canSwipe ? () => onSwipeReply?.(message) : undefined);
  const reducedMotion = prefersReducedMotion();
  const isOutgoingSend = isMine && (!isPersistedId(message.id) || !!message.client_temp_id);
  const isUploadingMessage = isMine && message.upload_status === 'uploading';
  const hasReactions = !!message.reactions?.length;
  const showDateSeparator = !prevMessage || (
    isValidTimestamp(message.timestamp) &&
    isValidTimestamp(prevMessage.timestamp) &&
    getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp)
  );
  const senderKey = (item: Message) => isOwnMessage(item) ? 'own' : item.sender_id ? `id:${item.sender_id}` : `name:${(item.sender_username || item.sender || '').toLowerCase()}`;
  const groupedWithPrevious = !!prevMessage && senderKey(message) === senderKey(prevMessage) && !showDateSeparator &&
    !showNewMessagesMarker;
  const groupedWithNext = !!nextMessage && senderKey(message) === senderKey(nextMessage) &&
    !(isValidTimestamp(message.timestamp) && isValidTimestamp(nextMessage.timestamp) &&
      getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(nextMessage.timestamp)) &&
    !nextShowsNewMessagesMarker;
  const isLastInGroup = !groupedWithNext;
  const showSenderName = isGroup && !isMine && !groupedWithPrevious;
  const reserveAvatarSpace = isGroup && !isMine;
  const showAvatar = reserveAvatarSpace && isLastInGroup;
  const showTail = isLastInGroup && !isImage;
  const hasImageCaption = isImage && typeof message.content !== 'string' && !!message.content?.caption?.trim();
  const isText = !isSticker && message.type !== 'file' && typeof message.content === 'string';
  const hasTime = isValidTimestamp(message.timestamp);
  const timeLabel = hasTime ? getMessageTime(message.timestamp) : '';
  const time = (interactive = true) => (
    <MessageTime
      message={message} time={timeLabel} isMine={isMine} isGroup={isGroup} isUploading={isUploadingMessage}
      userId={userId} translations={translations} onOpenReadStatus={onOpenReadStatus} interactive={interactive}
    />
  );
  const trailing = useMemo(() => isText && hasTime ? (
    <span data-message-time-spacer aria-hidden="true" className="invisible ml-2 inline-block text-[10px]"><MessageTime message={message} time={timeLabel} isMine={isMine}
      isGroup={isGroup} isUploading={isUploadingMessage} userId={userId} translations={translations} onOpenReadStatus={onOpenReadStatus}
      interactive={false} /></span>
  ) : undefined, [isText, hasTime, message, timeLabel, isMine, isGroup, isUploadingMessage, userId, translations, onOpenReadStatus]);

  const dateSeparator = showDateSeparator && isValidTimestamp(message.timestamp) && <DateSeparator label={getFormattedDateLabel(message.timestamp)} />;
  if (message.system_event) {
    const isMe = (id?: EntityId | null) => !!id && isOwnMessage({ ...message, is_own: false, sender_id: id, sender_username: null, sender: '' });
    return <>{dateSeparator}<SystemMessageLine event={message.system_event} isMe={isMe} /></>;
  }

  const handleReply = () => {
    if (!message.reply_to) return;
    onReplyClick(message.reply_to);
    if (messageRefs.current[message.reply_to]) {
      setTempHighlightedMessageId(message.reply_to);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
    }
  };

  return (
    <React.Fragment key={message.client_temp_id ?? message.id}>
      {!isMine && showNewMessagesMarker && (
        <div ref={firstUnreadMarkerRef} data-testid="new-messages-separator" className="motion-unread-separator is-visible scroll-mt-2 flex items-center gap-3 px-2"
          style={{ marginTop: '0.75rem' }}>
          <span aria-hidden="true" className="h-px flex-1 bg-primary/40" />
          <div className="shrink-0 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">{translations.newMessages}</div>
          <span aria-hidden="true" className="h-px flex-1 bg-primary/40" />
        </div>
      )}
      {dateSeparator}
      <div
        data-image-message={isImage || undefined}
        data-message-id={String(message.id)}
        ref={setRowRef}
        className={`${isOutgoingSend ? 'motion-message-send' : 'motion-message'} ${onToggleSelect || swipe.offset ? 'relative' : ''} ${canSwipe ? 'touch-pan-y' : ''} flex ${isMine ? 'justify-end' : 'justify-start'} ${
          isHighlighted ? 'highlight' : ''
        } ${isContextHighlighted ? 'context-menu-highlight' : ''} ${
          message.is_deleting ? (reducedMotion ? 'message-deleting message-deleting-reduced' : 'message-deleting') : ''
        }`}
        style={{
          ...(groupedWithPrevious ? { marginTop: '0.25rem' } : {}),
          ...(message.is_deleting ? { '--msg-h': `${messageRefs.current[message.id]?.offsetHeight ?? 0}px`, pointerEvents: 'none' } as React.CSSProperties : {}),
        }}
        onClick={(event) => {
          event.preventDefault();
          if (longPress.consumeClick()) return;
          onClick(event, message);
        }}
        onMouseDown={(event) => { if (event.shiftKey) event.preventDefault(); }}
        {...combineTouchHandlers(longPress.handlers, swipe.handlers)}
        onContextMenu={(event) => onMessageClick(event, message)}
      >
        {onToggleSelect && (
          <button type="button" role="checkbox" aria-checked={isSelected} aria-label={translations.selectMessage}
            className={`absolute inset-0 z-10 flex items-center rounded-lg pl-1 transition-colors ${isSelected ? 'bg-primary/10' : '[@media(hover:hover)]:hover:bg-accent/40'}`}
            onClick={(event) => { event.stopPropagation(); onToggleSelect(message, event.shiftKey); }}
            onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
            <span className={`motion-selection-check flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60 bg-background'}`}>
              {isSelected && <Check className="motion-selection-check h-3 w-3" />}
            </span>
          </button>
        )}
        {swipe.offset !== 0 && <SwipeReplyIcon side={isMine ? 'right' : 'left'} progress={swipe.progress} />}
        <div className={`${message.is_deleting ? 'flex w-full' : 'message-cv flex'} ${isMine ? 'justify-end' : 'justify-start'}`}
          style={{ transform: swipe.offset || (onToggleSelect && !isMine)
            ? `translateX(${swipe.offset + (onToggleSelect && !isMine ? 32 : 0)}px)` : undefined,
            ...(onToggleSelect && !isMine ? { width: message.is_deleting ? 'calc(100% - 32px)' : 'calc(100% + 1.5rem - 32px)' } : {}),
            transition: swipe.offset || reducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <div className={`flex min-w-0 items-end space-x-2 max-w-[85%] md:max-w-[70%] ${isText ? 'w-full' : ''} ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {showAvatar && (
            <button type="button" className="mb-1 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => {
              event.stopPropagation();
              onAvatarClick(message.sender_username || message.sender);
            }}>
              <AuthenticatedImage src={resolveMediaUrl(message.avatar_url)} alt={message.sender} className="motion-avatar h-8 w-8 rounded-full object-cover transition-opacity hover:opacity-80" />
            </button>
          )}
          {reserveAvatarSpace && !showAvatar && <div className="h-8 w-8 shrink-0" aria-hidden="true" />}
          <div data-message-column className={`group relative flex min-w-0 flex-col ${isText ? 'flex-1' : ''} ${isMine ? 'items-end' : 'items-start'}`}>
            {showSenderName && (
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                onAvatarClick(message.sender_username || message.sender);
              }} className="motion-press mb-1 max-w-[220px] truncate rounded px-1 text-sm text-muted-foreground hover:text-foreground">
                {message.sender}
              </button>
            )}
            <div className={bubbleClass({ isMine, showTail, isImage, isText, isSticker, hasReactions, deleting: message.is_deleting })}>
              {message.forwarded_from && (
                <ForwardedLabel forwardedFrom={message.forwarded_from} translations={translations} isMine={tinted} isImage={isImage} />
              )}
              {message.reply_to && (
                <ReplyPreview replyMessage={replyMessage} isMine={tinted} isReplyToOwn={!!replyMessage && isOwnMessage(replyMessage)} isImage={isImage}
                  onClick={interlocutorDeleted ? undefined : handleReply} />
              )}
              <div className={isSticker ? `relative w-fit ${isMine ? 'ml-auto' : 'mr-auto'}` : 'relative'}>
                {message.is_deleting && !reducedMotion && <DissolveParticles />}
                <MessageContent
                  message={message}
                  isMobile={isMobile} mediaBroken={mediaBroken} onMediaBroken={() => setBrokenMedia(mediaKey)} translations={translations}
                  getFileTypeConfig={getFileTypeConfig}
                  isOwnMessage={isOwnMessage}
                  renderMessageContent={renderMessageContent}
                  isAudioPlaying={isAudioPlaying}
                  setPlayingMessageId={setPlayingMessageId}
                  trailing={trailing}
                />
                {isText && hasTime && (
                  <div data-testid="message-time" className={`absolute bottom-0 right-0 translate-y-1 select-none text-[10px] opacity-80 ${isMine ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {time()}
                  </div>
                )}
                {isImage && !hasImageCaption && hasTime && (
                  <div data-testid="image-message-time" className={`absolute bottom-1.5 flex items-center rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm ${isMine ? 'right-1.5' : 'left-1.5'}`}>
                    {time()}
                  </div>
                )}
              </div>
              {message.reactions?.length ? (
                <ReactionList reactions={message.reactions} messageId={message.id} userId={userId} isMine={isMine} isImage={isImage} wsRef={wsRef}
                  onOpenReactionDetails={isGroup && onOpenReactionDetails
                    ? (reaction, reactions) => onOpenReactionDetails(message, reaction, reactions)
                    : undefined} />
              ) : null}
              {!isText && (!isImage || hasImageCaption) && hasTime && (
                <div className={`text-[10px] opacity-80 select-none flex items-center ${hasImageCaption ? '-mt-1 px-3 pb-2' : 'mt-1'} ${isMine ? 'justify-end text-primary-foreground' : 'text-muted-foreground'}`}>
                  {time()}
                </div>
              )}
              {message.delivery_error && (
                <div className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug ${tinted ? 'text-primary-foreground/80' : 'text-destructive'}`}>
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{message.delivery_error}</span>
                  {isMine && onResendMessage && <button type="button" className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px] font-medium underline-offset-2 hover:underline" onClick={(event) => {
                    event.stopPropagation();
                    onResendMessage(message);
                  }}>{message.upload_status === 'lost' ? translations.remove || 'Remove' : translations.resend || 'Resend'}</button>}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default memo(MessageItem);
