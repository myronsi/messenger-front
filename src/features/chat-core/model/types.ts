import type { Id } from '@/shared/lib/ids';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Message } from '@/entities/message';

export type SetMessages = Dispatch<SetStateAction<Message[]>>;
export type ErrorModal = { type: 'error'; message: string };
export type ShowError = (modal: ErrorModal) => void;
export type OutgoingPayload = Record<string, unknown>;

// Mutable connection state shared by the socket hook and the message sender.
export interface ChatTransport {
  wsRef: MutableRefObject<WebSocket | null>;
  messageQueueRef: MutableRefObject<OutgoingPayload[]>;
  pendingMessageIdsRef: MutableRefObject<Id[]>;
  connectionRetryKey: number;
  requestReconnect: () => void;
}