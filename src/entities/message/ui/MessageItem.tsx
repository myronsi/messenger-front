import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { MutableRefObject, memo } from 'react';
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
import { AlertCircle } from 'lucide-react';

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
  observerRef: MutableRefObject<IntersectionObserver | null>;
  firstUnreadMarkerRef: MutableRefObject<HTMLDivElement | null>;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  isOwnMessage: (message: Message) => boolean;
  getFileTypeConfig: (fileName: string) => FileTypeConfig | undefined;
  renderMessageContent: (message: Message) => React.ReactNode;
  isAudioPlaying: boolean;
  setPlayingMessageId: (id: EntityId | null) => void;
  onMessageClick: (event: React.MouseEvent, message: Message) => void;
  onClick: (event: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  onReplyClick: (messageId: EntityId) => void;
  setTempHighlightedMessageId: (id: EntityId | null) => void;
  wsRef: MutableRefObject<WebSocket | null>;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message, prevMessage, nextMessage, replyMessage, userId, isGroup, isImage, isMobile, showNewMessagesMarker,
  nextShowsNewMessagesMarker, translations, interlocutorDeleted, isHighlighted, isContextHighlighted, messageRefs,
  observerRef, firstUnreadMarkerRef, getFormattedDateLabel, getMessageTime, isOwnMessage, getFileTypeConfig,
  renderMessageContent, isAudioPlaying, setPlayingMessageId,
  onMessageClick, onClick, onAvatarClick, onReplyClick,
  setTempHighlightedMessageId, wsRef, onOpenReadStatus, onOpenReactionDetails, onResendMessage,
}) => {
  const isMine = isOwnMessage(message);
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
  const isText = message.type !== 'file' && typeof message.content === 'string';
  const hasTime = isValidTimestamp(message.timestamp);
  const time = (interactive = true) => (
    <MessageTime
      message={message} time={getMessageTime(message.timestamp)} isMine={isMine} isGroup={isGroup} isUploading={isUploadingMessage}
      userId={userId} translations={translations} onOpenReadStatus={onOpenReadStatus} interactive={interactive}
    />
  );

  const handleReply = () => {
    if (!message.reply_to) return;
    onReplyClick(message.reply_to);
    const element = messageRefs.current[message.reply_to];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setTempHighlightedMessageId(message.reply_to);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
    }
  };

  return (
    <React.Fragment key={message.client_temp_id ?? message.id}>
      {!isMine && (
        <div
          ref={showNewMessagesMarker ? firstUnreadMarkerRef : null}
          aria-hidden={!showNewMessagesMarker}
          className={`motion-unread-separator scroll-mt-2 flex justify-center ${showNewMessagesMarker ? 'is-visible' : ''}`}
          style={{ marginTop: 0 }}
        >
          <div className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">{translations.newMessages}</div>
        </div>
      )}
      {showDateSeparator && isValidTimestamp(message.timestamp) && (
        <div className="flex justify-center date-separator" data-date={getFormattedDateLabel(message.timestamp)}>
          <div className="px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground">{getFormattedDateLabel(message.timestamp)}</div>
        </div>
      )}
      <div
        ref={(element) => {
          messageRefs.current[message.id] = element;
          if (element && observerRef.current) {
            element.setAttribute('data-message-id', message.id.toString());
            observerRef.current.observe(element);
          }
        }}
        className={`${isOutgoingSend ? 'motion-message-send' : 'motion-message'} flex ${isMine ? 'justify-end' : 'justify-start'} ${
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
          if (message.reply_to && event.type === 'click' && !interlocutorDeleted) handleReply();
          else onClick(event, message);
        }}
        onContextMenu={(event) => onMessageClick(event, message)}
      >
        <div className={`${message.is_deleting ? 'flex w-full' : 'message-cv flex'} ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex min-w-0 items-end space-x-2 max-w-[85%] md:max-w-[70%] ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {showAvatar && (
            <button type="button" className="mb-1 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => {
              event.stopPropagation();
              onAvatarClick(message.sender_username || message.sender);
            }}>
              <AuthenticatedImage src={resolveMediaUrl(message.avatar_url)} alt={message.sender} className="motion-avatar h-8 w-8 rounded-full object-cover transition-opacity hover:opacity-80" />
            </button>
          )}
          {reserveAvatarSpace && !showAvatar && <div className="h-8 w-8 shrink-0" aria-hidden="true" />}
          <div className={`group relative flex min-w-0 flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            {showSenderName && (
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                onAvatarClick(message.sender_username || message.sender);
              }} className="motion-press mb-1 max-w-[220px] truncate rounded px-1 text-sm text-muted-foreground hover:text-foreground">
                {message.sender}
              </button>
            )}
            <div className={`motion-message-bubble relative w-fit min-w-0 max-w-full rounded-2xl [overflow-wrap:anywhere] ${message.is_deleting ? 'message-dissolve' : ''} ${
              isMine ? `bg-primary text-primary-foreground${showTail ? ' message-tail-right' : ''}` : `bg-accent text-accent-foreground${showTail ? ' message-tail-left' : ''}`
            } ${isImage ? `p-0 border${isMine ? ' border-primary' : ' border-accent'}` : `px-4 py-2 border${isMine ? ' border-primary' : ' border-accent'}`} ${
              hasReactions ? (isImage ? 'mb-4' : 'mb-3.5') : ''
            }`}>
              {message.forwarded_from && (
                <ForwardedLabel forwardedFrom={message.forwarded_from} translations={translations} isMine={isMine} isImage={isImage} />
              )}
              {message.reply_to && <ReplyPreview replyMessage={replyMessage} isMine={isMine} onClick={handleReply} />}
              <div className="relative">
                {message.is_deleting && !reducedMotion && <DissolveParticles />}
                <MessageContent
                  message={message}
                  isMobile={isMobile}
                  translations={translations}
                  getFileTypeConfig={getFileTypeConfig}
                  isOwnMessage={isOwnMessage}
                  renderMessageContent={renderMessageContent}
                  isAudioPlaying={isAudioPlaying}
                  setPlayingMessageId={setPlayingMessageId}
                  trailing={isText && hasTime ? <span aria-hidden="true" className="invisible ml-2 inline-block text-[10px]">{time(false)}</span> : undefined}
                />
                {isText && hasTime && (
                  <div data-testid="message-time" className={`absolute bottom-0 right-0 translate-y-1 select-none text-[10px] opacity-80 ${isMine ? 'text-white' : 'text-muted-foreground'}`}>
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
                  onOpenReactionDetails={(reaction, reactions) => onOpenReactionDetails?.(message, reaction, reactions)} />
              ) : null}
              {!isText && (!isImage || hasImageCaption) && hasTime && (
                <div className={`text-[10px] opacity-80 select-none flex items-center ${hasImageCaption ? '-mt-1 px-3 pb-2' : 'mt-1'} ${isMine ? 'justify-end text-white' : 'text-muted-foreground'}`}>
                  {time()}
                </div>
              )}
              {message.delivery_error && (
                <div className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug ${isMine ? 'text-red-100' : 'text-red-600'}`}>
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{message.delivery_error}</span>
                  {isMine && onResendMessage && <button type="button" className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium underline-offset-2 hover:underline" onClick={(event) => {
                    event.stopPropagation();
                    onResendMessage(message);
                  }}>{translations.resend || 'Resend'}</button>}
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
