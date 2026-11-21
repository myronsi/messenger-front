import { Lock, PinOff } from 'lucide-react';
import { requestPinChange, type PinnedMessage } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { pinSnippet } from '../model/pinSnippet';

interface PinnedMessagesPanelProps {
  chatId: EntityId;
  pins: PinnedMessage[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onJump: (messageId: EntityId) => void;
  onClose: () => void;
}

export const PinnedMessagesPanel = ({ chatId, pins, hasMore, isLoadingMore, isError, onLoadMore, onRetry, onJump, onClose }: PinnedMessagesPanelProps) => {
  const { translations, language } = useLanguage();
  const t = translations.messagePins;
  const formatTime = (value: string) => new Date(value).toLocaleString(localeOf(language), { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.pinnedMessages}</DialogTitle>
        </DialogHeader>
        <div data-testid="pinned-panel" className="-mx-2 max-h-[60vh] space-y-1 overflow-y-auto px-2">
          {isError && !pins.length && (
            <button type="button" onClick={onRetry} className="w-full py-6 text-center text-sm text-muted-foreground hover:text-foreground">
              {t.loadFailed}
            </button>
          )}
          {!isError && !pins.length && <p className="py-6 text-center text-sm text-muted-foreground">{t.empty}</p>}
          {pins.map((pin) => (
            <div key={String(pin.message.id)} data-testid="pinned-panel-item" className="flex items-center gap-1 rounded-md hover:bg-accent">
              <button type="button" onClick={() => onJump(pin.message.id)} title={t.goToMessage}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2 py-2 text-left">
                <span className="flex w-full min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate font-medium text-foreground"><EmojiText text={pin.message.sender} /></span>
                  <span className="shrink-0">{formatTime(pin.message.timestamp)}</span>
                  {pin.scope === 'me' && (
                    <span title={t.onlyForYou} className="shrink-0"><Lock aria-label={t.onlyForYou} className="h-3 w-3" /></span>
                  )}
                </span>
                <span className="line-clamp-2 w-full break-words text-sm"><EmojiText text={pinSnippet(pin.message, translations)} /></span>
              </button>
              <button type="button" aria-label={t.unpin} title={t.unpin}
                onClick={() => requestPinChange({ chatId, message: pin.message, pin })}
                className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                <PinOff className="h-4 w-4" />
              </button>
            </div>
          ))}
          {hasMore && (
            <button type="button" onClick={onLoadMore} disabled={isLoadingMore}
              className="w-full rounded-md py-2 text-sm text-primary transition-colors hover:bg-accent disabled:opacity-50">
              {t.loadMore}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
