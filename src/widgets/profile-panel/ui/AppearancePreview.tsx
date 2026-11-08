import React from 'react';
import type { ChatBackground } from '@/shared/lib/appearance/settings';

interface AppearancePreviewProps {
  label: string;
  incoming: string;
  outgoing: string;
  background: ChatBackground;
}

export const AppearancePreview: React.FC<AppearancePreviewProps> = ({ label, incoming, outgoing, background }) => (
  <figure aria-label={label} data-testid="appearance-preview"
    className={`chat-bg-${background} flex flex-col gap-[var(--chat-gap)] overflow-hidden rounded-lg border border-border px-5 py-4`}>
    <div className="flex justify-start">
      <div className="bubble-in message-tail-left max-w-[80%] rounded-bubble bg-accent px-3 py-1.5 text-accent-foreground">
        <div data-message-text-body>{incoming}</div>
        <div className="text-right text-[10px] text-muted-foreground">12:41</div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className="bubble-out message-tail-right max-w-[80%] rounded-bubble bg-primary px-3 py-1.5 text-primary-foreground">
        <div data-message-text-body>{outgoing}</div>
        <div className="text-right text-[10px] opacity-80">12:42</div>
      </div>
    </div>
  </figure>
);
