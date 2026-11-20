import { useEffect, useState } from 'react';
import { Cat, File, Heart, Image, Smile, Star, Video, type LucideIcon } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useTypingUsers, type TypingAction, type TypingUser } from '../model/typingStore';
import { LetterWave, type LetterWaveMode } from './LetterWave';
import { useTypingText } from './useTypingText';

const UPLOAD_ICONS: Partial<Record<TypingAction, LucideIcon>> = { uploading_photo: Image, uploading_video: Video, uploading_file: File };
const STICKERS = [Smile, Cat, Heart, Star];
const EXIT_MS = 220;
const NOBODY: TypingUser[] = [];

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const StickerCycle = () => (
  <span aria-hidden="true" data-testid="typing-sticker-cycle" className="relative inline-block h-3.5 w-3.5 shrink-0">
    {STICKERS.map((Icon, index) => (
      <Icon key={index} className="typing-sticker absolute inset-0 h-3.5 w-3.5" style={{ animationDelay: `${index * 0.75}s` }} />
    ))}
  </span>
);

interface TypingBubbleProps {
  chatId: EntityId;
  isGroup: boolean;
}

export const TypingBubble = ({ chatId, isGroup }: TypingBubbleProps) => {
  const users = useTypingUsers(chatId);
  const [lastUsers, setLastUsers] = useState(users);
  if (users.length && users !== lastUsers) setLastUsers(users);
  const closing = !users.length && lastUsers.length > 0;
  const shown = users.length ? users : lastUsers;
  const text = useTypingText(shown, isGroup);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setLastUsers(NOBODY), reducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  if (!shown.length) return null;
  const action = shown[0].action;
  const UploadIcon = UPLOAD_ICONS[action];
  const recording = action === 'recording_voice';
  const mode: LetterWaveMode = UploadIcon ? 'sweep' : 'wave';
  return (
    <div role="status" data-testid="typing-bubble" data-action={action} className={`typing-bubble${closing ? ' typing-bubble-closing' : ''}`}>
      <div className="typing-bubble-clip">
        <div className={`typing-bubble-body flex min-w-0 items-center gap-1.5 px-1 py-1 text-xs ${recording ? 'text-destructive' : 'text-muted-foreground'}`}>
          {recording && <span aria-hidden="true" data-testid="typing-rec-dot" className="typing-rec-dot h-2 w-2 shrink-0 rounded-full bg-destructive" />}
          {UploadIcon && <UploadIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
          <LetterWave text={text} mode={mode} className="min-w-0 truncate py-0.5" />
          {action === 'choosing_sticker' && <StickerCycle />}
        </div>
      </div>
    </div>
  );
};
