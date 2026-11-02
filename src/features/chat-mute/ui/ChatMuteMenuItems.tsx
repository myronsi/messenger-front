import { useState } from 'react';
import { ArrowLeft, Bell, BellOff, ChevronRight } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatMuteUntil, useChatMute, type MuteDuration } from '../model/chatMute';

interface ChatMuteMenuItemsProps {
  chatId: EntityId;
  onDone: () => void;
  onError: (message: string) => void;
  isChoosing?: boolean;
  onChoosingChange?: (isChoosing: boolean) => void;
}

const itemClass = 'flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50';

const ChatMuteMenuItems: React.FC<ChatMuteMenuItemsProps> = ({ chatId, onDone, onError, isChoosing: controlledChoosing, onChoosingChange }) => {
  const { translations, language } = useLanguage();
  const { mute, busy, setMute, isAvailable } = useChatMute(chatId);
  const [ownChoosing, setOwnChoosing] = useState(false);
  if (!isAvailable) return null;
  const isChoosing = controlledChoosing ?? ownChoosing;
  const setChoosing = onChoosingChange ?? setOwnChoosing;

  const apply = async (duration: MuteDuration | 'off') => {
    try {
      await setMute(duration);
      onDone();
    } catch {
      onError(translations.muteChatFailed);
    }
  };

  if (mute && !isChoosing) {
    return (
      <button type="button" disabled={busy} onClick={() => void apply('off')} className={itemClass}>
        <Bell className="h-4 w-4 shrink-0" />
        <span className="min-w-0">
          <span className="block">{translations.unmuteChat}</span>
          <span className="block text-xs text-muted-foreground">
            {mute.forever ? translations.mutedForever : translations.mutedUntil.replace('{time}', formatMuteUntil(mute.until, language))}
          </span>
        </span>
      </button>
    );
  }

  if (!isChoosing) {
    return (
      <button type="button" onClick={() => setChoosing(true)} className={itemClass}>
        <BellOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">{translations.muteChat}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  const durations: [MuteDuration, string][] = [
    ['1h', translations.muteFor1Hour],
    ['8h', translations.muteFor8Hours],
    ['forever', translations.muteForever],
  ];

  return (
    <>
      <button type="button" onClick={() => setChoosing(false)} className={`${itemClass} font-medium`}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span>{translations.muteChat}</span>
      </button>
      <div className="my-1 border-t border-border" />
      {durations.map(([duration, label]) => (
        <button key={duration} type="button" disabled={busy} onClick={() => void apply(duration)} className={itemClass}>
          {label}
        </button>
      ))}
    </>
  );
};

export default ChatMuteMenuItems;
