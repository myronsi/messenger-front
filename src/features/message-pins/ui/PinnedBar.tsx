import { useState } from 'react';
import { ListIcon, Lock } from 'lucide-react';
import type { PinnedMessage } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { nextPinIndex } from '../model/pinRules';
import { pinSnippet, pinThumbnail } from '../model/pinSnippet';
import { MAX_PIN_SEGMENTS, activeSegment } from '../model/pinSegments';

interface PinnedBarProps {
  pins: PinnedMessage[];
  count: number;
  hasMore: boolean;
  onJump: (messageId: EntityId) => void;
  onOpenList: () => void;
}


const PinSegments = ({ index, total }: { index: number; total: number }) => {
  const segments = Math.max(1, Math.min(total, MAX_PIN_SEGMENTS));
  const active = activeSegment(index, total);
  return (
    <span aria-hidden="true" data-testid="pinned-bar-segments" className="flex h-8 w-[3px] shrink-0 flex-col gap-[2px]">
      {Array.from({ length: segments }, (_, segment) => (
        <span key={segment} className={cn('min-h-0 flex-1 rounded-full transition-colors duration-200',
          segment === active ? 'bg-primary' : 'bg-primary/25')} />
      ))}
    </span>
  );
};

export const PinnedBar = ({ pins, count, hasMore, onJump, onOpenList }: PinnedBarProps) => {
  const { translations } = useLanguage();
  const t = translations.messagePins;
  const [index, setIndex] = useState(0);
  const shown = Math.min(index, pins.length - 1);
  const pin = pins[shown];
  if (!pin) return null;
  const total = Math.max(count, pins.length);
  const position = fillTemplate(t.position, { index: String(shown + 1), count: hasMore && total <= pins.length ? `${total}+` : String(total) });
  const thumbnail = pinThumbnail(pin.message);

  const handleClick = () => {
    onJump(pin.message.id);
    setIndex(nextPinIndex(shown, pins.length));
  };

  return (
    <div className="pointer-events-none relative z-30 h-0">
      <div data-testid="pinned-bar"
        className="motion-panel-in pointer-events-auto absolute left-2 right-2 top-2 flex h-12 items-center gap-2.5 rounded-[28px] border border-border/60 bg-background/95 py-1 pl-3.5 pr-1.5 shadow-sm md:bg-background/70 md:backdrop-blur-md md:left-[16.67%] md:right-[16.67%]">
        <PinSegments index={shown} total={total} />
        {thumbnail && (
          <AuthenticatedImage key={`thumb-${pin.message.id}`} src={thumbnail} alt="" data-testid="pinned-bar-thumbnail"
            className="motion-pin-swap h-9 w-9 shrink-0 rounded-xl object-cover" />
        )}
        <button type="button" onClick={handleClick} title={t.goToMessage} className="flex h-full min-w-0 flex-1 flex-col items-start justify-center text-left">
          <span className="flex max-w-full items-center gap-1 text-xs font-medium leading-tight text-primary">
            <span className="truncate">{t.pinnedMessage}</span>
            {total > 1 && <span data-testid="pinned-bar-position" className="shrink-0">{position}</span>}
            {pin.scope === 'me' && (
              <span data-testid="pinned-bar-lock" title={t.onlyForYou} className="shrink-0 text-muted-foreground">
                <Lock aria-label={t.onlyForYou} className="h-3 w-3" />
              </span>
            )}
          </span>
          <span key={String(pin.message.id)} data-testid="pinned-bar-snippet" className="motion-pin-swap block w-full truncate text-sm leading-snug">
            <EmojiText text={pinSnippet(pin.message, translations)} />
          </span>
        </button>
        <button type="button" onClick={onOpenList} aria-label={t.showAll} title={t.showAll}
          className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
          <ListIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
