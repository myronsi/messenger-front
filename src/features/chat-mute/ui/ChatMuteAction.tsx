import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { formatMuteUntil, useChatMute, type MuteDuration } from '../model/chatMute';

interface ChatMuteActionProps {
  chatId: EntityId;
  className: string;
}

const ChatMuteAction: React.FC<ChatMuteActionProps> = ({ chatId, className }) => {
  const { translations, language } = useLanguage();
  const { mute, busy, setMute } = useChatMute(chatId);
  const [failed, setFailed] = useState(false);

  const apply = async (duration: MuteDuration | 'off') => {
    setFailed(false);
    try {
      await setMute(duration);
    } catch {
      setFailed(true);
    }
  };

  const status = mute && (mute.forever ? translations.mutedForever : translations.mutedUntil.replace('{time}', formatMuteUntil(mute.until, language)));
  const title = failed ? translations.muteChatFailed : status || undefined;

  if (mute) {
    return (
      <button type="button" disabled={busy} title={title} onClick={() => void apply('off')} className={`${className} text-primary`}>
        <Bell className="h-5 w-5" />
        <span className="text-xs font-medium">{translations.unmuteChat}</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={busy} title={title} className={`${className} ${failed ? 'text-destructive' : 'text-subtle-foreground'}`}>
          <BellOff className="h-5 w-5" />
          <span className="text-xs font-medium">{translations.muteChat}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="z-[1300] w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{translations.muteChat}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void apply('1h')}>{translations.muteFor1Hour}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void apply('8h')}>{translations.muteFor8Hours}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void apply('forever')}>{translations.muteForever}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatMuteAction;
