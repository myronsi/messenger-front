import type { MutableRefObject } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';

export interface MessageListScrollOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  firstUnreadMessageId?: EntityId | null;
  highlightedMessageId: EntityId | null;
  tempHighlightedMessageId: EntityId | null;
  getFormattedDateLabel: (timestamp: string) => string;
  hasMoreMessages: boolean;
  hasMoreNewerMessages: boolean;
  isLoadingInitialMessages: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingNewerMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadLatestMessages?: () => Promise<void>;
  onLoadMessagesAround?: (messageId: EntityId) => Promise<void>;
  onScrollStart?: () => void;
  scrollToBottomKey?: string | number;
  isOwnMessage: (message: Message) => boolean;
  bottomInsetSource?: HTMLElement | null;
}
