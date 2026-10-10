import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { messengerApi } from '@/shared/api/baseApi';
import { uploadAttachment } from '@/shared/api/attachments';
import type { BodyOf, ResponseOf } from '@/shared/api/contract';
import { resolveUserId, type UserRef } from '@/entities/user';
import type { Id } from '@/shared/lib/ids';
import type { RawGroupDetails } from '../model/types';
import { toGroupDetails } from '../model/fromApi';

// Groups of the v2 contract (tag "groups").
export const groupApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Groups. Every change answers the group's new details. ---

    createGroup: builder.mutation<RawGroupDetails, { name: string; description?: string | null; members: UserRef[] }>({
      async queryFn({ name, description, members }, _api, _extra, fetchWithBQ) {
        const memberIds: Id[] = [];
        for (const member of members) {
          const resolved = await resolveUserId(member, fetchWithBQ);
          if ('error' in resolved) return { error: resolved.error };
          memberIds.push(resolved.id);
        }
        const result = await fetchWithBQ({
          url: '/groups',
          method: 'POST',
          body: { name: name.trim(), description: description?.trim() || null, member_ids: memberIds } satisfies BodyOf<'createGroup'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'createGroup'>) };
      },
      invalidatesTags: ['Chat'],
    }),

    updateGroup: builder.mutation<RawGroupDetails, { chatId: Id } & BodyOf<'updateGroup'>>({
      query: ({ chatId, ...patch }) => ({ url: `/groups/${encodeURIComponent(chatId)}`, method: 'PATCH', body: patch }),
      transformResponse: (group: ResponseOf<'updateGroup'>) => toGroupDetails(group),
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    // A group avatar is an attachment (purpose "avatar") that PUT /groups/{id}/avatar makes current.
    setGroupAvatar: builder.mutation<RawGroupDetails, { chatId: Id; file: File | Blob }>({
      async queryFn({ chatId, file }, _api, _extra, fetchWithBQ) {
        try {
          const attachment = await uploadAttachment(file, 'avatar');
          const result = await fetchWithBQ({
            url: `/groups/${encodeURIComponent(chatId)}/avatar`,
            method: 'PUT',
            body: { attachment_id: attachment.id } satisfies BodyOf<'setGroupAvatar'>,
          });
          if (result.error) return { error: result.error };
          return { data: toGroupDetails(result.data as ResponseOf<'setGroupAvatar'>) };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    addGroupParticipant: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants`,
          method: 'POST',
          body: { user_id: resolved.id } satisfies BodyOf<'addGroupParticipant'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'addGroupParticipant'>) };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    updateGroupParticipantRole: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef; role: BodyOf<'updateGroupParticipantRole'>['role'] }>({
      async queryFn({ chatId, user, role }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants/${encodeURIComponent(resolved.id)}`,
          method: 'PATCH',
          body: { role } satisfies BodyOf<'updateGroupParticipantRole'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'updateGroupParticipantRole'>) };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    // Removing a member answers nothing; the details are loaded again.
    removeGroupParticipant: builder.mutation<void, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants/${encodeURIComponent(resolved.id)}`,
          method: 'DELETE',
        });
        return result.error ? { error: result.error } : { data: undefined };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    transferGroupOwnership: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/transfer-owner`,
          method: 'POST',
          body: { user_id: resolved.id } satisfies BodyOf<'transferGroupOwnership'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'transferGroupOwnership'>) };
      },
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    leaveGroup: builder.mutation<void, Id>({
      query: (chatId) => ({ url: `/groups/${encodeURIComponent(chatId)}/leave`, method: 'POST' }),
      invalidatesTags: ['Chat'],
    }),

    deleteGroup: builder.mutation<void, Id>({
      query: (chatId) => ({ url: `/groups/${encodeURIComponent(chatId)}`, method: 'DELETE' }),
      invalidatesTags: ['Chat'],
    }),

  }),
});

export const {
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useSetGroupAvatarMutation,
  useAddGroupParticipantMutation,
  useUpdateGroupParticipantRoleMutation,
  useRemoveGroupParticipantMutation,
  useTransferGroupOwnershipMutation,
  useLeaveGroupMutation,
  useDeleteGroupMutation,
} = groupApi;
