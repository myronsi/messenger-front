import { useState, type HTMLAttributes, type Ref } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import type { EntityId } from '@/shared/api/entityId';
import { useMediaPreload } from '@/shared/api/useMediaPreload';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { Archive, ArchiveRestore, BellOff, Bookmark, Check, CheckCheck, Pin, Users } from 'lucide-react';
import type { Chat, ChatLastMessage } from '@/entities/message';
import { useChatMuteStatus } from '@/features/chat-mute';
import { TypingLabel, useTypingUsers } from '@/entities/typing';
import { useChatDraft } from '@/shared/hooks/useChatDraft';
import { isContentLabel } from '../model/useChatFormatters';
import { CallPreviewIcon } from './CallPreviewIcon';
import { useSwipeAction } from '@/shared/lib/useSwipeAction';

type RowBinding = Omit<HTMLAttributes<HTMLElement>, 'ref'> & { ref?: Ref<HTMLElement> };
const isCoarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

interface ChatListItemProps {
  chat: Chat;
  activeChatId?: EntityId;
  isContextSelected?: boolean;
  translations: Translations;
  getLastMessagePreview: (lastMessage?: ChatLastMessage | null) => string;
  getLastMessageTime: (lastMessage?: ChatLastMessage | null) => string;
  isOwnLastMessage: (lastMessage?: ChatLastMessage | null) => boolean;
  isOwnLastMessageRead: (lastMessage?: ChatLastMessage | null) => boolean;
  onClick: (chat: Chat) => void;
  onContextMenu: (event: React.MouseEvent, chat: Chat) => void;
  binding?: RowBinding;
  dragOffset?: number;
  isDragging?: boolean;
  onSwipeArchive?: (chat: Chat) => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  activeChatId,
  isContextSelected = false,
  translations,
  getLastMessagePreview,
  getLastMessageTime,
  isOwnLastMessage,
  isOwnLastMessageRead,
  onClick,
  onContextMenu,
  binding,
  dragOffset = 0,
  isDragging = false,
  onSwipeArchive,
}) => {
  const swipe = useSwipeAction(-1, onSwipeArchive ? () => onSwipeArchive(chat) : undefined);
  const saved = !!chat.is_saved;
  const ownLastMessage = isOwnLastMessage(chat.last_message);
  const ownLastMessageRead = isOwnLastMessageRead(chat.last_message);
  const ownLastMessageFailed = ownLastMessage && !!chat.last_message?.delivery_error;
  const isActive = chat.id === activeChatId;
  const callEvent = chat.last_message?.system_event?.kind === 'call' ? chat.last_message.system_event : null;
  const unreadCount = chat.unread_count || 0;
  const isMuted = !!useChatMuteStatus(chat.id).mute;
  const typingUsers = useTypingUsers(chat.id);
  const liveDraft = useChatDraft(chat.id);
  const [draft, setDraft] = useState(liveDraft);
  if ((chat.id !== activeChatId || !liveDraft) && draft !== liveDraft) setDraft(liveDraft);
  const showDraft = !!draft;
  const unreadBadgeClass = isMuted
    ? isActive ? 'bg-muted-foreground text-background md:bg-primary-foreground/60 md:text-primary' : 'bg-muted-foreground text-background'
    : isActive ? 'bg-primary text-primary-foreground md:bg-primary-foreground md:text-primary' : 'bg-primary text-primary-foreground';
  const lastContent = chat.last_message?.content;
  const lastThumbnail = typeof lastContent === 'object' && lastContent.thumbnail_url ? resolveMediaUrl(lastContent.thumbnail_url) : undefined;
  const preloadHandlers = useMediaPreload(lastThumbnail);
  const muted = isActive ? 'text-muted-foreground md:text-primary-foreground/80' : 'text-muted-foreground';
  const isSystemEvent = !!chat.last_message?.system_event;
  const isNotice = isSystemEvent || !chat.last_message;
  const showSender = chat.type === 'group' && !!chat.last_message && !isSystemEvent && !chat.last_message.delivery_error;
  const sender = ownLastMessage ? translations.replyFromYou : chat.last_message?.sender_name;
  const previewTone = unreadCount && !isNotice ? 'text-foreground' : 'text-muted-foreground';
  const ticksTone = ownLastMessageRead ? 'text-primary' : 'text-muted-foreground';

  const { ref: bindingRef, ...bindingHandlers } = binding ?? {};
  return (
    <div ref={bindingRef as Ref<HTMLDivElement>} {...bindingHandlers} data-dragging={isDragging || undefined}
      className={`relative ${isDragging ? 'z-20 shadow-lg' : ''}`}
      style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: isDragging ? 'none' : 'transform 160ms ease-out' }}>
    {swipe.offset !== 0 && (
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-end rounded-xl bg-primary px-5 text-primary-foreground">
        {chat.is_archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
      </div>
    )}
    <div
      data-testid="chat-list-item"
      data-chat-name={chat.name}
      data-context-selected={isContextSelected || undefined}
      onClick={() => onClick(chat)}
      {...preloadHandlers}
      {...swipe.handlers}
      onContextMenu={(event) => {
        if (isCoarsePointer()) {
          event.preventDefault();
          return;
        }
        onContextMenu(event, chat);
      }}
      style={{ transform: swipe.offset ? `translateX(${swipe.offset}px)` : undefined }}
      className={`motion-list-item motion-press relative flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer touch-pan-y select-none ${swipe.offset ? 'bg-background' : ''} ${
        isActive ? `md:bg-primary md:text-primary-foreground ${isContextSelected ? 'max-md:bg-accent max-md:text-accent-foreground' : ''}`
          : isContextSelected ? 'bg-accent text-accent-foreground'
            : '[@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground'
      }`}
    >
      <div className="relative shrink-0">
        {saved ? (
          <span data-testid="saved-messages-avatar" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bookmark className="h-6 w-6" aria-hidden="true" />
          </span>
        ) : (
        <AuthenticatedImage
          src={chat.avatar_url}
          fallbackSrc={chat.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR}
          alt={chat.display_name || chat.name}
          className={`motion-avatar h-12 w-12 rounded-full object-cover ${chat.interlocutor_deleted ? 'opacity-50' : ''}`}
        />
        )}
        {chat.type === 'one-on-one' && !saved && !chat.interlocutor_deleted && chat.is_online && (
          <span data-testid="chat-online-dot" className="motion-presence absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex min-w-0 flex-1 items-center gap-1.5 text-[15px] leading-5 ${unreadCount ? 'font-semibold' : 'font-medium'}`}>
            {chat.type === 'group' && <Users aria-label={translations.group} className={`h-4 w-4 shrink-0 ${muted}`} />}
            <span className="truncate">
              {saved ? translations.chatOrganizer.savedMessages : chat.interlocutor_deleted ? translations.deletedUser : chat.display_name || chat.name}
            </span>
            {isMuted && (
              <BellOff data-testid="chat-muted-icon" aria-label={translations.mutedForever} className={`h-3.5 w-3.5 shrink-0 ${muted}`} />
            )}
          </div>
          {!showDraft && !saved && ownLastMessage && !ownLastMessageFailed && !isSystemEvent && (
            <span className={`flex shrink-0 items-center transition-colors duration-150 ${isActive ? `${ticksTone} md:text-primary-foreground/80` : ticksTone}`}
              title={ownLastMessageRead ? translations.messageRead : translations.messageSent}>
              {ownLastMessageRead ? <CheckCheck size={16} /> : <Check size={16} />}
            </span>
          )}
          {!showDraft && chat.last_message && (
            <span className={`shrink-0 text-xs ${unreadCount && !isMuted ? 'font-medium text-primary' : ''} ${muted}`}>
              {getLastMessageTime(chat.last_message)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <div className={`min-w-0 flex-1 truncate text-sm leading-5 ${isActive ? `${previewTone} md:text-primary-foreground/80` : previewTone}`}>
            {typingUsers.length ? (
              <TypingLabel users={typingUsers} isGroup={chat.type === 'group'} className={`italic ${isActive ? 'text-primary md:text-primary-foreground' : 'text-primary'}`} />
            ) : showDraft ? (
              <span data-testid="chat-draft-preview">
                <span className="text-destructive">{draft.kind === 'edit' ? translations.chatEditPrefix : translations.chatDraftPrefix} </span>
                {draft.text.replace(/\s+/g, ' ')}
              </span>
            ) : (<>
              {showSender && sender && <span className={isActive ? 'text-foreground md:text-primary-foreground' : 'text-foreground'}>{sender}: </span>}
              {isNotice || isContentLabel(chat.last_message)
                ? (
                  <span data-testid={isNotice ? 'chat-system-preview' : 'chat-label-preview'} className="italic">
                    {callEvent && <CallPreviewIcon event={callEvent} outgoing={ownLastMessage} onAccent={isActive} />}
                    {getLastMessagePreview(chat.last_message)}
                  </span>
                )
                : getLastMessagePreview(chat.last_message)}
            </>)}
          </div>
          {chat.is_pinned && !unreadCount && <Pin aria-label={translations.pinned} className={`h-3.5 w-3.5 shrink-0 rotate-45 ${muted}`} />}
          <span
            aria-hidden={unreadCount === 0}
            className={`motion-unread-indicator flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${unreadCount ? `is-visible ${unreadBadgeClass}` : ''}`}
          >
            {unreadCount > 99 ? '99+' : unreadCount || ''}
          </span>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ChatListItem;
