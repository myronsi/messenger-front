import { messengerApi } from '@/shared/api/baseApi';
import type { components } from '@/shared/api/generated/schema';

export type LinkPreview = components['schemas']['LinkPreview'];

export const linkPreviewApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getLinkPreview: builder.query<LinkPreview, string>({
      query: (url) => `/link-preview?url=${encodeURIComponent(url)}`,
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetLinkPreviewQuery } = linkPreviewApi;
