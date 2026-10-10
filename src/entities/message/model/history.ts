import type { Message } from './types';
import type { Id } from '@/shared/lib/ids';

export interface MessageHistoryResponse {
  history: Message[];
  has_more: boolean;
  has_more_before?: boolean;
  has_more_after?: boolean;
  next_before_id: Id | null;
  next_after_id?: Id | null;
}
