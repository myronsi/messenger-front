import { apiClient } from '@/shared/api/client';
import { messengerApi } from '@/shared/api/baseApi';
import type { EntityId } from '@/shared/api/entityId';
import { contractQuery } from '@/shared/api/queryResult';
import type { AddImportMessagesRequest, ChatImport, ChatImportSender, SenderDecision, StartImportRequest } from './importTypes';

const chat = (chatId: EntityId) => ({ chat_id: String(chatId) });
const one = (importId: EntityId) => ({ import_id: String(importId) });
const sender = (importId: EntityId, key: string) => ({ import_id: String(importId), sender_key: key });

export const importCalls = {
  createGroup: (name: string) => contractQuery(() => apiClient.POST('/groups', { body: { name, member_ids: [] } })),
  start: (chatId: EntityId, body: StartImportRequest) => contractQuery(() => apiClient.POST('/chats/{chat_id}/imports', {
    params: { path: chat(chatId) }, body,
  })),
  get: (importId: EntityId, signal?: AbortSignal) => contractQuery(() => apiClient.GET('/imports/{import_id}', { params: { path: one(importId) }, signal })),
  addMessages: (importId: EntityId, body: AddImportMessagesRequest, signal?: AbortSignal) => contractQuery(() => apiClient.PUT('/imports/{import_id}/messages', {
    params: { path: one(importId) }, body, signal,
  })),
  finish: (importId: EntityId) => contractQuery(() => apiClient.POST('/imports/{import_id}/finish', { params: { path: one(importId) } })),
  remove: (importId: EntityId) => contractQuery(async () => {
    const result = await apiClient.DELETE('/imports/{import_id}', { params: { path: one(importId) } });
    return { ...result, data: result.response.ok ? null : undefined };
  }),
};

const chatTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `imports:${chatId}` });

export const importApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatImports: builder.query<ChatImport[], EntityId>({
      queryFn: async (chatId, { signal }) => {
        const result = await contractQuery(() => apiClient.GET('/chats/{chat_id}/imports', { params: { path: chat(chatId) }, signal }));
        return result.error ? { error: result.error } : { data: result.data.items };
      },
      providesTags: (_result, _error, chatId) => [chatTag(chatId)],
    }),
    removeImport: builder.mutation<null, { importId: EntityId; chatId: EntityId }>({
      queryFn: ({ importId }) => importCalls.remove(importId),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
    assignImportSender: builder.mutation<ChatImportSender, { importId: EntityId; chatId: EntityId; key: string; userId: EntityId | null }>({
      queryFn: ({ importId, key, userId }) => contractQuery(() => apiClient.PUT('/imports/{import_id}/senders/{sender_key}', {
        params: { path: sender(importId, key) }, body: { user_id: userId === null ? null : String(userId) },
      })),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
    decideImportSender: builder.mutation<ChatImportSender, { importId: EntityId; chatId: EntityId; key: string; decision: SenderDecision }>({
      queryFn: ({ importId, key, decision }) => contractQuery(() => apiClient.POST('/imports/{import_id}/senders/{sender_key}/decision', {
        params: { path: sender(importId, key) }, body: { decision },
      })),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
  }),
});

export const {
  useGetChatImportsQuery, useRemoveImportMutation, useAssignImportSenderMutation, useDecideImportSenderMutation,
} = importApi;
