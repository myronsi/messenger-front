import type { CreateChatResponse } from '@/entities/chat';

export interface PreviewChatHandle {
  created: Promise<CreateChatResponse>;
  carriedMessage: boolean;
}

interface PreviewSendQueueOptions {
  create: (initialMessage?: string) => Promise<CreateChatResponse>;
  onBusyChange: (busy: boolean) => void;
  onDrained: (response: CreateChatResponse | null) => void;
}

export const createPreviewSendQueue = ({ create, onBusyChange, onDrained }: PreviewSendQueueOptions) => {
  let creation: Promise<CreateChatResponse> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let queued = 0;

  const ensureChat = (initialMessage?: string): PreviewChatHandle => {
    if (creation) return { created: creation, carriedMessage: false };
    const started = create(initialMessage);
    creation = started;
    started.catch(() => { if (creation === started) creation = null; });
    return { created: started, carriedMessage: initialMessage !== undefined };
  };

  const enqueue = (task: (chat: typeof ensureChat) => Promise<void>) => {
    queued += 1;
    if (queued === 1) onBusyChange(true);
    const run = chain.then(() => task(ensureChat));
    chain = run.catch(() => undefined);
    return run.finally(async () => {
      queued -= 1;
      if (queued) return;
      onBusyChange(false);
      const response = creation ? await creation.catch(() => null) : null;
      if (!queued) onDrained(response);
    });
  };

  return { enqueue };
};
