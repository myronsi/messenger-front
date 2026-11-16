import { apiClient } from '@/shared/api/client';
import { messengerApi } from '@/shared/api/baseApi';
import { apiUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { apiTask, contractData } from '@/shared/api/tasks';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import type { CustomEmoji, EmojiPack, EmojiReportReason } from '../model/types';

const PACKS = { type: 'Emoji' as const, id: 'packs' };
const packTag = (id: string) => ({ type: 'Emoji' as const, id: `pack-${id}` });
const packPath = (packId: string) => ({ params: { path: { pack_id: packId } } });
const emojiPath = (packId: string, emojiId: string) => ({ params: { path: { pack_id: packId, emoji_id: emojiId } } });
const changed = (packId: string) => [PACKS, packTag(packId), { type: 'Emoji' as const, id: 'group' }];

export const uploadEmojiImage = (image: Blob, onProgress?: (percent: number) => void) => {
  const form = new FormData();
  form.set('file', image);
  form.set('purpose', 'emoji');
  form.set('kind', 'image');
  return uploadWithProgress<components['schemas']['Attachment']>({ url: apiUrl('/attachments'), formData: form, onProgress });
};

export const emojiApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    listEmojiPacks: builder.query<EmojiPack[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/emoji/packs', { signal })).items),
      providesTags: [PACKS],
    }),
    getEmojiPack: builder.query<EmojiPack, string>({
      queryFn: (packId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/emoji/packs/{pack_id}', { ...packPath(packId), signal }))),
      providesTags: (result, error, packId) => [packTag(packId)],
    }),
    getEmojiPackByLink: builder.query<EmojiPack, string>({
      queryFn: (slug, { signal }) => apiTask(async () => contractData(await apiClient.GET('/emoji/links/{slug}', { params: { path: { slug } }, signal }))),
      providesTags: (result) => (result ? [packTag(result.id)] : []),
    }),
    getGroupEmoji: builder.query<EmojiPack, string>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/groups/{chat_id}/emoji', { params: { path: { chat_id: chatId } }, signal }))),
      providesTags: (result) => [{ type: 'Emoji' as const, id: 'group' }, ...(result ? [packTag(result.id)] : [])],
    }),
    getCustomEmoji: builder.query<CustomEmoji, string>({
      queryFn: (emojiId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/emoji/items/{emoji_id}', { params: { path: { emoji_id: emojiId } }, signal }))),
      keepUnusedDataFor: 3600,
    }),
    createEmojiPack: builder.mutation<EmojiPack, string>({
      queryFn: (title) => apiTask(async () => contractData(await apiClient.POST('/emoji/packs', { body: { title } }))),
      invalidatesTags: [PACKS],
    }),
    renameEmojiPack: builder.mutation<EmojiPack, { packId: string; title: string }>({
      queryFn: ({ packId, title }) => apiTask(async () => contractData(await apiClient.PATCH('/emoji/packs/{pack_id}', { ...packPath(packId), body: { title } }))),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    deleteEmojiPack: builder.mutation<void, string>({
      queryFn: (packId) => apiTask(async () => { contractData(await apiClient.DELETE('/emoji/packs/{pack_id}', packPath(packId))); }),
      invalidatesTags: (result, error, packId) => changed(packId),
    }),
    setEmojiPackInstalled: builder.mutation<void, { packId: string; installed: boolean }>({
      queryFn: ({ packId, installed }) => apiTask(async () => {
        if (installed) contractData(await apiClient.PUT('/emoji/packs/{pack_id}/installation', packPath(packId)));
        else contractData(await apiClient.DELETE('/emoji/packs/{pack_id}/installation', packPath(packId)));
      }),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    addCustomEmoji: builder.mutation<CustomEmoji, { packId: string; image: Blob; shortcode: string }>({
      queryFn: ({ packId, image, shortcode }) => apiTask(async () => {
        const attachment = await uploadEmojiImage(image);
        return contractData(await apiClient.POST('/emoji/packs/{pack_id}/emoji', { ...packPath(packId), body: { attachment_id: attachment.id, shortcode } }));
      }),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    renameCustomEmoji: builder.mutation<CustomEmoji, { packId: string; emojiId: string; shortcode: string }>({
      queryFn: ({ packId, emojiId, shortcode }) => apiTask(async () => contractData(await apiClient.PATCH('/emoji/packs/{pack_id}/emoji/{emoji_id}', {
        ...emojiPath(packId, emojiId), body: { shortcode },
      }))),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    deleteCustomEmoji: builder.mutation<void, { packId: string; emojiId: string }>({
      queryFn: ({ packId, emojiId }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/emoji/packs/{pack_id}/emoji/{emoji_id}', emojiPath(packId, emojiId)));
      }),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    reportEmojiPack: builder.mutation<void, { packId: string; reason: EmojiReportReason }>({
      queryFn: ({ packId, reason }) => apiTask(async () => {
        contractData(await apiClient.POST('/emoji/packs/{pack_id}/report', { ...packPath(packId), body: { reason } }));
      }),
    }),
  }),
});

export const {
  useListEmojiPacksQuery, useGetEmojiPackQuery, useGetEmojiPackByLinkQuery, useGetGroupEmojiQuery, useGetCustomEmojiQuery,
  useCreateEmojiPackMutation, useRenameEmojiPackMutation, useDeleteEmojiPackMutation, useSetEmojiPackInstalledMutation,
  useAddCustomEmojiMutation, useRenameCustomEmojiMutation, useDeleteCustomEmojiMutation, useReportEmojiPackMutation,
} = emojiApi;
