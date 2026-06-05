import type { Message } from './types';

export interface MessageHistoryResponse {
  history: Message[];
  has_more: boolean;
  next_before_id: number | null;
}
