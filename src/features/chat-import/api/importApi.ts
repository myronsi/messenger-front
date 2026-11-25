import { messengerApi } from '@/shared/api/baseApi';
import type { EntityId } from '@/shared/api/entityId';
import { importFetch } from './importFetch';
import type {
  AddImportMessagesRequest, AddImportMessagesResponse, ChatImport, ChatImportList, ChatImportSender, SenderDecision, StartImportRequest,
} from './importTypes';

const id = (value: EntityId) => encodeURIComponent(String(value));
const path = (importId: EntityId, rest = '') => `/imports/${id(importId)}${rest}`;
const senderPath = (importId: EntityId, key: string, rest = '') => path(importId, `/senders/${encodeURIComponent(key)}${rest}`);
const chatImportsPath = (chatId: EntityId) => `/chats/${id(chatId)}/imports`;

export const importCalls = {
  createGroup: (name: string) => importFetch<{ id: EntityId }>('POST', '/groups', { name, member_ids: [] }),
  start: (chatId: EntityId, body: StartImportRequest) => importFetch<ChatImport>('POST', chatImportsPath(chatId), body),
  get: (importId: EntityId, signal?: AbortSignal) => importFetch<ChatImport>('GET', path(importId), undefined, signal),
  addMessages: (importId: EntityId, body: AddImportMessagesRequest, signal?: AbortSignal) => (
    importFetch<AddImportMessagesResponse>('PUT', path(importId, '/messages'), body, signal)
  ),
  finish: (importId: EntityId) => importFetch<ChatImport>('POST', path(importId, '/finish')),
  remove: (importId: EntityId) => importFetch<null>('DELETE', path(importId)),
};

const chatTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `imports:${chatId}` });

export const importApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatImports: builder.query<ChatImport[], EntityId>({
      queryFn: async (chatId, { signal }) => {
        const result = await importFetch<ChatImportList>('GET', chatImportsPath(chatId), undefined, signal);
        return result.error ? { error: result.error } : { data: result.data?.items ?? [] };
      },
      providesTags: (_result, _error, chatId) => [chatTag(chatId)],
    }),
    removeImport: builder.mutation<null, { importId: EntityId; chatId: EntityId }>({
      queryFn: ({ importId }) => importCalls.remove(importId),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
    assignImportSender: builder.mutation<ChatImportSender, { importId: EntityId; chatId: EntityId; key: string; userId: EntityId | null }>({
      queryFn: ({ importId, key, userId }) => importFetch<ChatImportSender>('PUT', senderPath(importId, key), { user_id: userId }),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
    decideImportSender: builder.mutation<ChatImportSender, { importId: EntityId; chatId: EntityId; key: string; decision: SenderDecision }>({
      queryFn: ({ importId, key, decision }) => importFetch<ChatImportSender>('POST', senderPath(importId, key, '/decision'), { decision }),
      invalidatesTags: (_result, _error, { chatId }) => [chatTag(chatId)],
    }),
  }),
});

export const {
  useGetChatImportsQuery, useRemoveImportMutation, useAssignImportSenderMutation, useDecideImportSenderMutation,
} = importApi;
