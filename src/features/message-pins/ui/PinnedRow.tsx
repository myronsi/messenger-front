import { FileText, Lock, MessageSquare, Mic, PinOff } from 'lucide-react';
import { requestPinChange, type PinnedMessage } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { useSwipeAction } from '@/shared/lib/useSwipeAction';
import { formatDateLabel } from '@/shared/utils/dateFormatters';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { pinSnippet, pinThumbnail } from '../model/pinSnippet';

interface PinnedRowProps {
  chatId: EntityId;
  pin: PinnedMessage;
  swipeToUnpin: boolean;
  onJump: (messageId: EntityId) => void;
}

const iconFor = (pin: PinnedMessage) => {
  const content = pin.message.content;
  if (typeof content === 'string') return MessageSquare;
  if (content?.file_type === 'voice' || content?.kind === 'voice') return Mic;
  return FileText;
};

export const PinnedRow = ({ chatId, pin, swipeToUnpin, onJump }: PinnedRowProps) => {
  const { translations, language } = useLanguage();
  const t = translations.messagePins;
  const unpin = () => requestPinChange({ chatId, message: pin.message, pin });
  const swipe = useSwipeAction(-1, swipeToUnpin ? unpin : undefined);
  const thumbnail = pinThumbnail(pin.message);
  const Icon = iconFor(pin);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const date = pin.message.timestamp ? formatDateLabel(pin.message.timestamp, language, today, yesterday) : '';

  return (
    <div data-testid="pinned-panel-item" className="relative overflow-hidden rounded-2xl">
      {swipe.offset !== 0 && (
        <div aria-hidden="true" className="absolute inset-y-0 right-0 flex items-center pr-5 text-destructive" style={{ opacity: swipe.progress }}>
          <PinOff className="h-5 w-5" />
        </div>
      )}
      <div {...swipe.handlers} style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
        className={cn('relative flex touch-pan-y items-center gap-1 rounded-2xl bg-background/0 hover:bg-accent/60',
          !swipe.offset && 'transition-transform duration-200')}>
        <button type="button" onClick={() => onJump(pin.message.id)} title={t.goToMessage}
          className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left">
          {thumbnail ? (
            <AuthenticatedImage src={thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words text-sm leading-snug"><EmojiText text={pinSnippet(pin.message, translations)} /></span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate"><EmojiText text={pin.message.sender} />{date && ` · ${date}`}</span>
              {pin.scope === 'me' && <Lock role="img" aria-label={t.onlyForYou} className="h-3 w-3 shrink-0" />}
            </span>
          </span>
        </button>
        <button type="button" aria-label={t.unpin} title={t.unpin} onClick={unpin}
          className="motion-press mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
          <PinOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
