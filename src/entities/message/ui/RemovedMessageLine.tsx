import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { Message } from '../model/types';
import { moderationRule } from '../model/moderationRemoval';

interface RemovedMessageLineProps {
  message: Message;
  isMine: boolean;
  time?: string;
  rowRef?: (element: HTMLDivElement | null) => void;
}

const RemovedMessageLine: React.FC<RemovedMessageLineProps> = ({ message, isMine, time, rowRef }) => {
  const t = useLanguage().translations.moderation;
  const reason = isMine ? message.moderation_reason : null;
  const text = reason?.text.trim();
  return (
    <div ref={rowRef} data-message-id={String(message.id)} data-testid="removed-message" className={`motion-message flex px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] rounded-lg border border-dashed border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="italic">{t.removedByModeration}</span>
          {time && <span className="ml-1 text-[10px] opacity-70">{time}</span>}
        </div>
        {reason && (
          <div className="mt-1 text-xs">
            <div>{fillTemplate(t.removedReason, { rule: t.removedRules[moderationRule(reason.code)] })}</div>
            {text && <div className="mt-0.5 whitespace-pre-wrap break-words">{text}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemovedMessageLine;
