import { useRef } from 'react';
import type { Message } from '@/entities/message';
import { useMessageListScroll } from './useMessageListScroll';

export const MessageListScrollProbe = ({ messages, chat = 'chat', target = null, ownId, onScrollStart, loading = false, newer = false }: {
  messages: Message[]; chat?: string; target?: string | null; ownId?: string; onScrollStart?: () => void; loading?: boolean; newer?: boolean;
}) => {
  const messageRefs = useRef({});
  const { chatContainerRef, contentRef } = useMessageListScroll({
    messages, messageRefs, highlightedMessageId: target, tempHighlightedMessageId: null,
    getFormattedDateLabel: () => '', hasMoreMessages: false, hasMoreNewerMessages: newer,
    isLoadingInitialMessages: loading, isLoadingOlderMessages: false, isLoadingNewerMessages: false,
    scrollToBottomKey: chat, isOwnMessage: (item) => item.id === ownId, onScrollStart,
  });
  return <div data-testid="container" ref={chatContainerRef}><div ref={contentRef} /></div>;
};
