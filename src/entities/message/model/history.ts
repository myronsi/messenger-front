import type { Message } from './types';

export interface MessageHistoryResponse {
  history: Message[];
  has_more: boolean;
  has_more_before?: boolean;
  has_more_after?: boolean;
  next_before_id: number | null;
  next_after_id?: number | null;
}
