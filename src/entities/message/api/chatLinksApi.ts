import { apiClient } from '@/shared/api/client';
import { messengerApi } from '@/shared/api/baseApi';
import { apiTask, contractData } from '@/shared/api/tasks';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';

type ApiMessage = components['schemas']['Message'];

export interface ChatLinkItem {
  id: EntityId;
  url: string;
  text: string;
  timestamp: string;
  sender: string;
  senderUsername: string | null;
}

const LINK = /(?:https?:\/\/|www\.)[^\s<>"']+/i;

export const linkItem = (message: ApiMessage): ChatLinkItem | null => {
  const text = (message.content ?? '').trim();
  const found = text.match(LINK)?.[0]?.replace(/[).,!?]+$/, '');
  if (!found) return null;
  const url = /^https?:\/\//i.test(found) ? found : `https://${found}`;
  return {
    id: message.id, url, text, timestamp: message.created_at,
    sender: message.sender?.display_name ?? '', senderUsername: message.sender?.username ?? null,
  };
};

export const chatLinksApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatLinks: builder.query<ChatLinkItem[], EntityId>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/chats/{chat_id}/media', {
        params: { path: { chat_id: String(chatId) }, query: { kind: 'link', limit: 100 } }, signal,
      })).items.map((hit) => linkItem(hit.message)).filter((item): item is ChatLinkItem => !!item)),
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-links` }],
    }),
  }),
});

export const { useGetChatLinksQuery } = chatLinksApi;
