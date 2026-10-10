import { messengerApi } from '@/shared/api/baseApi';
import { queryFor, type BodyOf, type ResponseOf, type Schema } from '@/shared/api/contract';
import type { Id } from '@/shared/lib/ids';
import type { ChatAudiosResponse, ChatPhotosResponse, ChatSearchResponse, ForwardMessagesResponse, Message } from '../model/types';
import type { MessageHistoryResponse } from '../model/history';
import { toAppMessage, toFileContent } from '../model/fromApi';
import { historyDirection, historyPath, toHistoryResponse } from './history';

// Messages of the v2 contract over HTTP. Sending, editing, reactions and read markers go over the WebSocket
// (src/shared/api/realtime.ts); these are the reads and the actions that answer a result.

const MEDIA_PAGE = 100;

const toSearchResult = (hit: Schema<'SearchHit'>) => {
  const message = toAppMessage(hit.message);
  return {
    id: message.id,
    sender_id: message.sender_id,
    sender: message.sender,
    sender_username: message.sender_username,
    avatar_url: message.avatar_url,
    content: message.content,
    type: message.type,
    forwarded_from: message.forwarded_from,
    timestamp: message.timestamp,
  };
};

export const messageApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getMessageHistory: builder.query<MessageHistoryResponse, {
      chatId: Id; limit?: number; beforeId?: Id | null; afterId?: Id | null;
      aroundId?: Id | null;
    }>({
      query: ({ chatId, limit = 50, beforeId, afterId, aroundId }) => historyPath(chatId, {
        limit, before: beforeId, after: afterId, around: aroundId,
      }),
      transformResponse: (page: ResponseOf<'listMessages'>, _meta, { beforeId, afterId, aroundId }) => toHistoryResponse(
        page, historyDirection({ limit: 0, before: beforeId, after: afterId, around: aroundId }),
      ),
      keepUnusedDataFor: 300,
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: chatId }],
    }),

    // Forwards one message to several chats; answers the new messages.
    forwardMessage: builder.mutation<ForwardMessagesResponse, { sourceMessageId: Id; targetChatIds: Id[] }>({
      query: ({ sourceMessageId, targetChatIds }) => ({
        url: `/messages/${encodeURIComponent(sourceMessageId)}/forward`,
        method: 'POST',
        body: { chat_ids: targetChatIds } satisfies BodyOf<'forwardMessage'>,
      }),
      transformResponse: (result: ResponseOf<'forwardMessage'>) => ({
        forwarded: result.items.map((message) => ({ chat_id: message.chat_id, message_id: message.id })),
        failed: [],
      }),
      invalidatesTags: ['Message', 'Chat'],
    }),

    // Images of a chat, newest first.
    getChatPhotos: builder.query<ChatPhotosResponse, Id>({
      query: (chatId) => `/chats/${encodeURIComponent(chatId)}/media${queryFor<'listChatMedia'>({ kind: 'image', limit: MEDIA_PAGE })}`,
      transformResponse: (page: ResponseOf<'listChatMedia'>) => ({
        photos: page.items.flatMap(({ message }) => (message.attachment ? [{
          id: message.id,
          url: message.attachment.url,
          file_url: message.attachment.url,
          file_name: message.attachment.filename,
          file_type: message.attachment.content_type,
          file_size: message.attachment.size,
          image_width: message.attachment.width ?? undefined,
          image_height: message.attachment.height ?? undefined,
          thumbnail_url: message.attachment.thumbnail_url ?? undefined,
          timestamp: message.created_at,
        }] : [])),
      }),
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-photos` }],
    }),

    // Voice messages and audio files of a chat, newest first.
    getChatAudios: builder.query<ChatAudiosResponse, Id>({
      query: (chatId) => `/chats/${encodeURIComponent(chatId)}/media${queryFor<'listChatMedia'>({ kind: 'audio', limit: MEDIA_PAGE })}`,
      transformResponse: (page: ResponseOf<'listChatMedia'>) => ({
        audios: page.items.flatMap(({ message }) => {
          if (!message.attachment) return [];
          const content = toFileContent(message.attachment);
          return [{
            id: message.id,
            url: content.file_url,
            file_url: content.file_url,
            file_name: content.file_name,
            file_type: content.file_type,
            file_size: content.file_size,
            audio_metadata: content.audio_metadata,
            audio_kind: message.attachment.kind === 'voice' ? 'voice' as const : 'file' as const,
            timestamp: message.created_at,
          }];
        }),
      }),
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-audios` }],
    }),

    searchChatMessages: builder.query<ChatSearchResponse, { chatId: Id; query: string }>({
      query: ({ chatId, query }) => `/chats/${encodeURIComponent(chatId)}/messages/search${queryFor<'searchMessages'>({ q: query, limit: 50 })}`,
      transformResponse: (page: ResponseOf<'searchMessages'>) => ({ results: page.items.map(toSearchResult) }),
    }),

    editMessage: builder.mutation<Message, { id: Id; content: string }>({
      query: ({ id, content }) => ({
        url: `/messages/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: { content } satisfies BodyOf<'editMessage'>,
      }),
      transformResponse: (message: ResponseOf<'editMessage'>) => toAppMessage(message),
    }),

    deleteMessage: builder.mutation<void, { id: Id; scope: 'me' | 'everyone' }>({
      query: ({ id, scope }) => ({
        url: `/messages/${encodeURIComponent(id)}${queryFor<'deleteMessage'>({ scope })}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useGetMessageHistoryQuery,
  useForwardMessageMutation,
  useGetChatPhotosQuery,
  useGetChatAudiosQuery,
  useSearchChatMessagesQuery,
  useEditMessageMutation,
  useDeleteMessageMutation,
} = messageApi;
