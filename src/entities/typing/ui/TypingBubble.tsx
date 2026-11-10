import { Mic } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useTypingUsers } from '../model/typingStore';
import { TypingLabel } from './TypingLabel';

interface TypingBubbleProps {
  chatId: EntityId;
  isGroup: boolean;
}

export const TypingBubble = ({ chatId, isGroup }: TypingBubbleProps) => {
  const users = useTypingUsers(chatId);
  if (!users.length) return null;
  const recording = users.every(user => user.action === 'recording_voice');
  return (
    <div data-testid="typing-bubble" role="status" className="typing-bubble flex min-w-0 items-center gap-2">
      <div aria-hidden="true" className="bubble-in flex h-9 shrink-0 items-center gap-1 rounded-bubble bg-accent px-3.5 text-accent-foreground">
        {recording && <Mic className="mr-0.5 h-3.5 w-3.5 opacity-70" />}
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <TypingLabel users={users} isGroup={isGroup} className={isGroup ? 'min-w-0 truncate text-xs text-muted-foreground' : 'sr-only'} />
    </div>
  );
};
