import { apiClient } from '@/shared/api/client';
import { messengerApi } from '@/shared/api/baseApi';
import { getApiBaseUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { apiTask, contractData } from '@/shared/api/tasks';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import type { Sticker, StickerPack } from '../model/types';

type ReportReason = components['schemas']['StickerPackReportReason'];

const PACKS = { type: 'Sticker' as const, id: 'packs' };
const OWNED = { type: 'Sticker' as const, id: 'owned' };
const packTag = (id: string) => ({ type: 'Sticker' as const, id: `pack-${id}` });
const packPath = (packId: string) => ({ params: { path: { pack_id: packId } } });
const stickerPath = (packId: string, stickerId: string) => ({ params: { path: { pack_id: packId, sticker_id: stickerId } } });
const changed = (packId: string) => [PACKS, OWNED, packTag(packId)];

export const uploadStickerImage = (image: Blob, onProgress?: (percent: number) => void) => {
  const form = new FormData();
  form.set('file', image, 'sticker.png');
  form.set('purpose', 'sticker');
  form.set('kind', 'image');
  return uploadWithProgress<components['schemas']['Attachment']>({
    url: `${String(getApiBaseUrl()).replace(/\/$/, '')}/attachments`, formData: form, onProgress,
  });
};

export const ownPacksApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    listOwnStickerPacks: builder.query<StickerPack[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/stickers/packs', { params: { query: { owned: true } }, signal })).items),
      providesTags: [OWNED],
    }),
    createStickerPack: builder.mutation<StickerPack, string>({
      queryFn: (title) => apiTask(async () => contractData(await apiClient.POST('/stickers/packs', { body: { title } }))),
      invalidatesTags: [PACKS, OWNED],
    }),
    renameStickerPack: builder.mutation<StickerPack, { packId: string; title: string }>({
      queryFn: ({ packId, title }) => apiTask(async () => contractData(await apiClient.PATCH('/stickers/packs/{pack_id}', { ...packPath(packId), body: { title } }))),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    deleteStickerPack: builder.mutation<void, string>({
      queryFn: (packId) => apiTask(async () => { contractData(await apiClient.DELETE('/stickers/packs/{pack_id}', packPath(packId))); }),
      invalidatesTags: (result, error, packId) => changed(packId),
    }),
    addSticker: builder.mutation<Sticker, { packId: string; attachmentId: string; emoji: string }>({
      queryFn: ({ packId, attachmentId, emoji }) => apiTask(async () => contractData(await apiClient.POST('/stickers/packs/{pack_id}/stickers', {
        ...packPath(packId), body: { attachment_id: attachmentId, emoji },
      }))),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    setStickerEmoji: builder.mutation<Sticker, { packId: string; stickerId: string; emoji: string }>({
      queryFn: ({ packId, stickerId, emoji }) => apiTask(async () => contractData(await apiClient.PATCH('/stickers/packs/{pack_id}/stickers/{sticker_id}', {
        ...stickerPath(packId, stickerId), body: { emoji },
      }))),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    deleteSticker: builder.mutation<void, { packId: string; stickerId: string }>({
      queryFn: ({ packId, stickerId }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/stickers/packs/{pack_id}/stickers/{sticker_id}', stickerPath(packId, stickerId)));
      }),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    reorderStickers: builder.mutation<void, { packId: string; stickerIds: string[] }>({
      queryFn: ({ packId, stickerIds }) => apiTask(async () => {
        contractData(await apiClient.PUT('/stickers/packs/{pack_id}/order', { ...packPath(packId), body: { sticker_ids: stickerIds } }));
      }),
      invalidatesTags: (result, error, { packId }) => changed(packId),
    }),
    reportStickerPack: builder.mutation<void, { packId: string; reason: ReportReason }>({
      queryFn: ({ packId, reason }) => apiTask(async () => {
        contractData(await apiClient.POST('/stickers/packs/{pack_id}/report', { ...packPath(packId), body: { reason } }));
      }),
    }),
  }),
});

export const {
  useListOwnStickerPacksQuery,
  useCreateStickerPackMutation,
  useRenameStickerPackMutation,
  useDeleteStickerPackMutation,
  useAddStickerMutation,
  useSetStickerEmojiMutation,
  useDeleteStickerMutation,
  useReorderStickersMutation,
  useReportStickerPackMutation,
} = ownPacksApi;
