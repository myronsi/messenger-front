import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { MutableRefObject, memo } from 'react';
import { Message, ReactionInfo } from '../model/types';
import { isValidTimestamp } from '../model/messageListScrollUtils';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';
import MessageContent from './MessageContent';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { prefersReducedMotion } from '../model/messageDeletion';
import {
  AlertCircle, Check, CheckCheck, Clock1, Clock2, Clock3, Clock4, Clock5, Clock6,
  Clock7, Clock8, Clock9, Clock10, Clock11, Clock12,
} from 'lucide-react';
import type { Id } from '@/shared/lib/ids';
import { isLocalId } from '@/shared/lib/ids';
import MediaImg from '@/shared/ui/MediaImg';

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

const clockIcons = [Clock1, Clock2, Clock3, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, Clock10, Clock11, Clock12];

const UploadClockStatus: React.FC<{ progress?: number }> = ({ progress }) => {
  const [clockIndex, setClockIndex] = React.useState(0);
  React.useEffect(() => {
    const interval = window.setInterval(() => setClockIndex((current) => (current + 1) % clockIcons.length), 95);
    return () => window.clearInterval(interval);
  }, []);
  const ClockIcon = clockIcons[clockIndex];
  return (
    <span className="inline-flex items-center gap-0.5">
      <ClockIcon size={14} className="transition-opacity duration-75" />
      {typeof progress === 'number' && <span className="tabular-nums">{Math.max(1, Math.min(99, progress))}%</span>}
    </span>
  );
};

// Only primitives, the message itself and stable callbacks are passed so React.memo can skip
// every item that did not change when a new message, reaction or typing event arrives.
interface MessageItemProps {
  message: Message;
  prevMessage: Message | null;
  nextMessage: Message | null;
  replyMessage?: Message;
  userId: Id;
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
  setPlayingMessageId: (id: Id | null) => void;
  onMessageClick: (event: React.MouseEvent, message: Message) => void;
  onClick: (event: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  onReplyClick: (messageId: Id) => void;
  setTempHighlightedMessageId: (id: Id | null) => void;
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
  const isOutgoingSend = isMine && (isLocalId(message.id) || !!message.client_temp_id);
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
  const forwardedFrom = message.forwarded_from;
  const forwardedLabel = forwardedFrom
    ? (translations.forwardedFrom || 'Forwarded from {sender}').replace(
      '{sender}',
      forwardedFrom.sender_name || forwardedFrom.sender_username || translations.deletedUser || 'Deleted User'
    )
    : null;

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
            <button type="button" className="mb-1 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring" onClick={(event) => {
              event.stopPropagation();
              onAvatarClick(message.sender_username || message.sender);
            }}>
              <MediaImg src={resolveMediaUrl(message.avatar_url)} alt={message.sender} className="motion-avatar h-8 w-8 rounded-full object-cover transition-opacity hover:opacity-80" />
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
              {forwardedLabel && <div className="mb-1 text-xs font-medium opacity-70">{forwardedLabel}</div>}
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
                />
                {isImage && isValidTimestamp(message.timestamp) && (
                  <div className={`absolute bottom-1 text-[10px] px-2 py-1 bg-gray-500/50 rounded-xl flex items-center space-x-1 ${isMine ? 'right-1 text-white' : 'left-1 text-muted-foreground'}`}>
                    {message.edited_at && <span>{translations.edited}</span>}
                    <span>{getMessageTime(message.timestamp)}</span>
                    {isMine && !message.delivery_error && (
                      <button type="button" className="inline-flex items-center gap-0.5 transition-colors duration-150" onClick={(event) => {
                        event.stopPropagation();
                        if (isGroup) onOpenReadStatus?.(message);
                      }}>
                        {isUploadingMessage ? <UploadClockStatus progress={message.upload_progress} /> : (
                          <>
{message.read_by?.some((reader) => reader.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
{isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {message.reactions?.length ? (
                <ReactionList reactions={message.reactions} messageId={message.id} userId={userId} isMine={isMine} isImage={isImage} wsRef={wsRef}
                  onOpenReactionDetails={(reaction, reactions) => onOpenReactionDetails?.(message, reaction, reactions)} />
              ) : null}
              {!isImage && isValidTimestamp(message.timestamp) && (
                <div className={`text-[10px] mt-1 opacity-80 select-none flex items-center space-x-1 ${isMine ? 'text-white' : 'text-muted-foreground'}`}>
                  {message.edited_at && <span>{translations.edited}</span>}
                  <span>{getMessageTime(message.timestamp)}</span>
                  {isMine && !message.delivery_error && (
                    <button type="button" className="inline-flex items-center gap-0.5 transition-colors duration-150" onClick={(event) => {
                      event.stopPropagation();
                      if (isGroup) onOpenReadStatus?.(message);
                    }}>
                      {isUploadingMessage ? <UploadClockStatus progress={message.upload_progress} /> : (
                        <>
{message.read_by?.some((reader) => reader.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
{isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
</>
                      )}
                    </button>
                  )}
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
