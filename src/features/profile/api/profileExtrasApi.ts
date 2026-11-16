import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { userModel } from '@/shared/api/goModels';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { apiUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { messengerApi } from '@/shared/api/baseApi';

type Schema = components['schemas'];
export type ProfileUpload = Schema['Attachment'];
export type SetBackgroundBody = Schema['SetBackgroundRequest'];
export type SetMusicBody = Schema['SetMusicRequest'];

export interface ProfileUploadArgs {
  file: Blob;
  purpose: 'profile_music' | 'profile_background';
  startMs?: number;
  endMs?: number;
  onProgress?: (percent: number) => void;
}

export const uploadProfileFile = ({ file, purpose, startMs, endMs, onProgress }: ProfileUploadArgs) => {
  const form = new FormData();
  form.set('file', file);
  form.set('purpose', purpose);
  if (startMs !== undefined) form.set('start_ms', String(Math.max(0, Math.round(startMs))));
  if (endMs !== undefined) form.set('end_ms', String(Math.max(1, Math.round(endMs))));
  return uploadWithProgress<ProfileUpload>({ url: apiUrl('/attachments'), formData: form, onProgress });
};

export const profileExtrasApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    setMyMusic: builder.mutation<ReturnType<typeof userModel>, SetMusicBody>({
      queryFn: (body, { signal }) => apiTask(async () => userModel(contractData(await apiClient.PUT('/me/music', { body, signal })))),
      invalidatesTags: ['Auth', 'User'],
    }),
    deleteMyMusic: builder.mutation<ReturnType<typeof userModel>, void>({
      queryFn: (_, { signal }) => apiTask(async () => userModel(contractData(await apiClient.DELETE('/me/music', { signal })))),
      invalidatesTags: ['Auth', 'User'],
    }),
    setMyBackground: builder.mutation<ReturnType<typeof userModel>, SetBackgroundBody>({
      queryFn: (body, { signal }) => apiTask(async () => userModel(contractData(await apiClient.PUT('/me/background', { body, signal })))),
      invalidatesTags: ['Auth', 'User'],
    }),
    deleteMyBackground: builder.mutation<ReturnType<typeof userModel>, void>({
      queryFn: (_, { signal }) => apiTask(async () => userModel(contractData(await apiClient.DELETE('/me/background', { signal })))),
      invalidatesTags: ['Auth', 'User'],
    }),
    setMyTimeZone: builder.mutation<void, string>({
      queryFn: (time_zone, { signal }) => apiTask(async () => { contractData(await apiClient.PATCH('/me', { body: { time_zone }, signal })); }),
    }),
  }),
});

export const {
  useSetMyMusicMutation, useDeleteMyMusicMutation, useSetMyBackgroundMutation, useDeleteMyBackgroundMutation, useSetMyTimeZoneMutation,
} = profileExtrasApi;

export const setGroupBackground = async (chatId: string, body: SetBackgroundBody | null) => {
  const params = { path: { chat_id: chatId } };
  const group = body
    ? contractData(await apiClient.PUT('/groups/{chat_id}/background', { params, body }))
    : contractData(await apiClient.DELETE('/groups/{chat_id}/background', { params }));
  return group;
};
