import { compareIds, isPersistedId, type EntityId } from '@/shared/api/entityId';
import { MutableRefObject, RefObject, useLayoutEffect, useReducer, useRef } from 'react';
import { MAX_LOADED_MESSAGES, MESSAGE_PAGE_SIZE, Message } from '@/entities/message';
import { clampScrollTop, type ScrollTarget } from './smoothScroll';

const SEEK_PAGES = 3;
const ARRIVAL_LEAD = 0.6;

export type SeekStep = 'older' | 'newer' | 'around' | 'none';

interface HighlightScrollOptions {
  targetId: EntityId | null;
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  hasMoreMessages: boolean;
  isLoadingOlderMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  hasMoreNewerMessages?: boolean;
  isLoadingNewerMessages?: boolean;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadMessagesAround?: (messageId: EntityId) => Promise<void>;
  chatContainerRef: RefObject<HTMLDivElement | null>;
  startAnimation: (getTarget: ScrollTarget) => void;
  replacedWindowRef: MutableRefObject<Message[] | null>;
}

interface SeekRequest {
  id: EntityId;
  done: boolean;
  busy: boolean;
  pages: number;
  around: boolean;
  older: boolean;
}

export const centeredScrollTop = (container: HTMLElement, element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return container.scrollTop + rect.top - container.getBoundingClientRect().top - (container.clientHeight - rect.height) / 2;
};

const isNewerThanLoaded = (targetId: EntityId, messages: Message[]) => {
  const newest = [...messages].reverse().find((message) => isPersistedId(message.id));
  return !!newest && isPersistedId(targetId) && compareIds(targetId, newest.id) > 0;
};

interface SeekState {
  newer: boolean;
  pages: number;
  loaded: number;
  hasMoreMessages: boolean;
  hasMoreNewerMessages: boolean;
  canLoadAround: boolean;
}

export const nextSeekStep = ({ newer, pages, loaded, hasMoreMessages, hasMoreNewerMessages, canLoadAround }: SeekState): SeekStep => {
  const hasMore = newer ? hasMoreNewerMessages : hasMoreMessages;
  if (!hasMore) return 'none';
  const pageFits = newer || loaded + MESSAGE_PAGE_SIZE <= MAX_LOADED_MESSAGES;
  if (pages < SEEK_PAGES && pageFits) return newer ? 'newer' : 'older';
  if (canLoadAround) return 'around';
  return newer ? 'newer' : 'older';
};

export const useHighlightScroll = ({
  targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, chatContainerRef,
  hasMoreNewerMessages = false, isLoadingNewerMessages = false, onLoadNewerMessages, onLoadMessagesAround,
  startAnimation, replacedWindowRef,
}: HighlightScrollOptions) => {
  const requestRef = useRef<SeekRequest | null>(null);
  const [loadRound, nextLoadRound] = useReducer((round: number) => round + 1, 0);

  useLayoutEffect(() => {
    if (!targetId) {
      requestRef.current = null;
      return;
    }
    if (requestRef.current?.id !== targetId) {
      requestRef.current = { id: targetId, done: false, busy: false, pages: 0, around: false, older: !isNewerThanLoaded(targetId, messages) };
    }
    const request = requestRef.current;
    if (request.done || messages.length === 0) return;
    const element = messageRefs.current[targetId];
    const container = chatContainerRef.current;
    if (element) {
      request.done = true;
      if (!container) {
        element.scrollIntoView({ block: 'center' });
        return;
      }
      if (replacedWindowRef.current === messages) {
        const lead = (request.older ? 1 : -1) * container.clientHeight * ARRIVAL_LEAD;
        container.scrollTop = clampScrollTop(container, centeredScrollTop(container, element) + lead);
      }
      startAnimation(() => (element.isConnected ? centeredScrollTop(container, element) : null));
      return;
    }
    if (request.busy || isLoadingOlderMessages || isLoadingNewerMessages) return;
    const step = request.around ? 'none' : nextSeekStep({
      newer: isNewerThanLoaded(targetId, messages), pages: request.pages, loaded: messages.length,
      hasMoreMessages, hasMoreNewerMessages, canLoadAround: !!onLoadMessagesAround,
    });
    const load = step === 'around' ? () => onLoadMessagesAround!(targetId)
      : step === 'older' ? onLoadOlderMessages : step === 'newer' ? onLoadNewerMessages : undefined;
    if (!load) {
      request.done = true;
      return;
    }
    request.busy = true;
    if (step === 'around') request.around = true;
    else request.pages += 1;
    void load().finally(() => {
      request.busy = false;
      nextLoadRound();
    });
  }, [targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, chatContainerRef,
    hasMoreNewerMessages, isLoadingNewerMessages, onLoadNewerMessages, onLoadMessagesAround, startAnimation, replacedWindowRef, loadRound]);
};
