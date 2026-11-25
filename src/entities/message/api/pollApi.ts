import { apiClient } from '@/shared/api/client';
import { contractData, ContractProblem } from '@/shared/api/tasks';
import { userModel } from '@/shared/api/goModels';
import type { EntityId } from '@/shared/api/entityId';
import type { ContactUser, MessagePoll } from '../model/richTypes';

export const POLL_VOTERS_PAGE = 50;

const pollPath = (chatId: EntityId, messageId: EntityId) => ({ chat_id: String(chatId), message_id: String(messageId) });

export const votePoll = async (chatId: EntityId, messageId: EntityId, options: number[]): Promise<MessagePoll> =>
  contractData(await apiClient.PUT('/chats/{chat_id}/messages/{message_id}/poll/votes', {
    params: { path: pollPath(chatId, messageId) }, body: { options },
  }));

export const closePoll = async (chatId: EntityId, messageId: EntityId): Promise<MessagePoll> =>
  contractData(await apiClient.POST('/chats/{chat_id}/messages/{message_id}/poll/close', {
    params: { path: pollPath(chatId, messageId) },
  }));

export interface PollVotersPage {
  items: (ContactUser & { contact_display_name?: string | null })[];
  next_cursor: string | null;
}

export const fetchPollVoters = async (chatId: EntityId, messageId: EntityId, option: number, after?: string | null): Promise<PollVotersPage> => {
  const page = contractData(await apiClient.GET('/chats/{chat_id}/messages/{message_id}/poll/voters', {
    params: { path: pollPath(chatId, messageId), query: { option, limit: POLL_VOTERS_PAGE, ...(after ? { after } : {}) } },
  }));
  return { items: page.items.map(userModel), next_cursor: page.next_cursor ?? null };
};

export const pollErrorCode = (error: unknown) =>
  error instanceof ContractProblem ? (error.data as { code?: string } | null | undefined)?.code : undefined;
