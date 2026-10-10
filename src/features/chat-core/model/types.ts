import type { Id } from '@/shared/lib/ids';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Message } from '@/entities/message';
import type { ChatRealtime } from '@/shared/api/realtime';

export type SetMessages = Dispatch<SetStateAction<Message[]>>;
export type ErrorModal = { type: 'error'; message: string };
export type ShowError = (modal: ErrorModal) => void;

// How a chat screen talks to the server: the shared WebSocket bound to the chat, and the local ids of the
// messages it sent that the server has not confirmed yet.
export interface ChatTransport {
  realtime: ChatRealtime;
  pendingMessageIdsRef: MutableRefObject<Id[]>;
}
