import { Loader2, Lock, Pin } from 'lucide-react';
import { useGetPinnedMessagesQuery, useLoadMorePinnedMessagesMutation } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { formatDateLabel } from '@/shared/utils/dateFormatters';
import { pinsEnabled } from '../model/usePinnedMessages';
import { pinSnippet } from '../model/pinSnippet';

interface ProfilePinnedPanelProps {
  chatId: EntityId;
  onJumpToMessage?: (messageId: EntityId) => void;
}

export const ProfilePinnedPanel = ({ chatId, onJumpToMessage }: ProfilePinnedPanelProps) => {
  const { translations, language } = useLanguage();
  const t = translations.messagePins;
  const { data, isLoading, isError, refetch } = useGetPinnedMessagesQuery(chatId, { skip: !pinsEnabled(chatId) });
  const [loadMore, { isLoading: isLoadingMore }] = useLoadMorePinnedMessagesMutation();
  const pins = data?.items ?? [];
  const cursor = data?.next_cursor;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (isError && !pins.length) {
    return (
      <button type="button" onClick={() => void refetch()} className="w-full px-5 py-6 text-center text-sm text-destructive">
        {t.loadFailed}
      </button>
    );
  }
  if (!pins.length) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t.empty}</p>;
  return (
    <div className="px-3 py-2">
      <ul data-testid="profile-pinned" className="space-y-1">
        {pins.map((pin) => (
          <li key={String(pin.message.id)}>
            <button type="button" title={t.goToMessage} onClick={() => onJumpToMessage?.(pin.message.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-accent/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Pin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-sm"><EmojiText text={pinSnippet(pin.message, translations)} /></span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="truncate"><EmojiText text={pin.message.sender} /> · {formatDateLabel(pin.message.timestamp, language, today, yesterday)}</span>
                  {pin.scope === 'me' && <Lock role="img" aria-label={t.onlyForYou} className="h-3 w-3 shrink-0" />}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {cursor && (
        <button type="button" disabled={isLoadingMore} onClick={() => void loadMore({ chatId, after: cursor })}
          className="mt-1 w-full rounded-md py-2 text-sm text-primary transition-colors hover:bg-accent disabled:opacity-50">
          {t.loadMore}
        </button>
      )}
    </div>
  );
};
