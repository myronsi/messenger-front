import { apiClient } from '@/shared/api/client';
import { messengerApi } from '@/shared/api/baseApi';
import { apiTask, contractData } from '@/shared/api/tasks';
import type { Sticker, StickerPack, StickerPackRef } from '../model/types';

const PACKS = { type: 'Sticker' as const, id: 'packs' };
const RECENT = { type: 'Sticker' as const, id: 'recent' };
const packTag = (id: string) => ({ type: 'Sticker' as const, id: `pack-${id}` });

const loadPack = async ({ packId, slug }: StickerPackRef, signal: AbortSignal) => {
  if (slug) return contractData(await apiClient.GET('/stickers/links/{slug}', { params: { path: { slug } }, signal }));
  return contractData(await apiClient.GET('/stickers/packs/{pack_id}', { params: { path: { pack_id: String(packId) } }, signal }));
};

export const stickerApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    listStickerPacks: builder.query<StickerPack[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/stickers/packs', { signal })).items),
      providesTags: [PACKS],
    }),
    listRecentStickers: builder.query<Sticker[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/stickers/recent', { signal })).items),
      providesTags: [RECENT],
    }),
    getStickerPack: builder.query<StickerPack, StickerPackRef>({
      queryFn: (ref, { signal }) => apiTask(() => loadPack(ref, signal)),
      providesTags: (pack) => (pack ? [packTag(pack.id)] : []),
    }),
    setStickerPackInstalled: builder.mutation<void, { packId: string; installed: boolean }>({
      queryFn: ({ packId, installed }) => apiTask(async () => {
        const options = { params: { path: { pack_id: packId } } };
        const result = installed
          ? await apiClient.PUT('/stickers/packs/{pack_id}/installation', options)
          : await apiClient.DELETE('/stickers/packs/{pack_id}/installation', options);
        contractData(result);
      }),
      invalidatesTags: (result, error, { packId }) => [PACKS, RECENT, packTag(packId)],
    }),
  }),
});

export const {
  useListStickerPacksQuery,
  useListRecentStickersQuery,
  useGetStickerPackQuery,
  useSetStickerPackInstalledMutation,
} = stickerApi;
