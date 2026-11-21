import { useState } from 'react';
import { ListIcon, Lock } from 'lucide-react';
import type { PinnedMessage } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { nextPinIndex } from '../model/pinRules';
import { pinSnippet } from '../model/pinSnippet';

interface PinnedBarProps {
  pins: PinnedMessage[];
  count: number;
  hasMore: boolean;
  onJump: (messageId: EntityId) => void;
  onOpenList: () => void;
}

export const PinnedBar = ({ pins, count, hasMore, onJump, onOpenList }: PinnedBarProps) => {
  const { translations } = useLanguage();
  const t = translations.messagePins;
  const [index, setIndex] = useState(0);
  const shown = Math.min(index, pins.length - 1);
  const pin = pins[shown];
  if (!pin) return null;
  const total = Math.max(count, pins.length);
  const position = fillTemplate(t.position, { index: String(shown + 1), count: hasMore && total <= pins.length ? `${total}+` : String(total) });

  const handleClick = () => {
    onJump(pin.message.id);
    setIndex(nextPinIndex(shown, pins.length));
  };

  return (
    <div data-testid="pinned-bar" className="motion-panel-in flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background pl-3 pr-2 sm:pl-6 sm:pr-4">
      <button type="button" onClick={handleClick} title={t.goToMessage}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left transition-colors hover:bg-accent/50">
        <span aria-hidden="true" className="h-8 w-0.5 shrink-0 rounded-full bg-primary" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1 text-xs font-medium leading-tight text-primary">
            <span className="truncate">{t.pinnedMessage}</span>
            {total > 1 && <span data-testid="pinned-bar-position" className="shrink-0 text-muted-foreground">{position}</span>}
            {pin.scope === 'me' && (
              <span data-testid="pinned-bar-lock" title={t.onlyForYou} className="shrink-0 text-muted-foreground">
                <Lock aria-label={t.onlyForYou} className="h-3 w-3" />
              </span>
            )}
          </span>
          <span data-testid="pinned-bar-snippet" className="truncate text-sm leading-snug">
            <EmojiText text={pinSnippet(pin.message, translations)} />
          </span>
        </span>
      </button>
      <button type="button" onClick={onOpenList} aria-label={t.showAll} title={t.showAll}
        className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
        <ListIcon className="h-5 w-5" />
      </button>
    </div>
  );
};
