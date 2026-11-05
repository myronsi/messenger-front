import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Message } from '@/entities/message';

export type SetMessages = Dispatch<SetStateAction<Message[]>>;
export type ErrorModal = { type: 'error'; message: string };
export type ShowError = (modal: ErrorModal) => void;
export type OutgoingPayload = Record<string, unknown>;

// Mutable connection state shared by the socket hook and the message sender.
export interface ChatTransport {
  wsRef: MutableRefObject<SocketSender | null>;
  messageQueueRef: MutableRefObject<OutgoingPayload[]>;
  pendingMessageIdsRef: MutableRefObject<EntityId[]>;
  connectionRetryKey: number;
  requestReconnect: () => void;
}
