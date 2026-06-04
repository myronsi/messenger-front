import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { User } from '@/entities/user';
import { clearAuthTokens, getAccessToken, refreshAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      clearAuthTokens();
    }
  }

  return result;
};

// Define types for your API responses
export interface Message {
  id: number;
  sender_id?: number;
  content?: string;
  senderId: number;
  chatId: number;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'file';
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  isEdited?: boolean;
  replyTo?: number;
  reactions?: Array<{
    userId: number;
    emoji: string;
  }>;
}

export interface ChatLastMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string | { file_url: string; file_name: string; file_type: string; file_size: number };
  type: 'message' | 'file';
  timestamp: string;
  read_by?: { user_id: number; read_at: string }[];
  delivery_error?: string | null;
}

export interface Chat {
  id: number;
  name?: string;
  type: 'private' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: number | null;
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token?: string | null;
  token_type?: string;
  refresh_token?: string;
  user?: User;
  device_part?: string;
  qr_part?: string;
  two_factor_required?: boolean;
  login_challenge?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TwoFactorLoginRequest {
  login_challenge: string;
  code: string;
}

export interface RegisterRequest {
  username: string;
  display_name: string;
  password: string;
  email?: string;
}

// Define specific types for the API responses
export interface OneOnOneChatResponse {
  chats: Array<{
    id: number;
    interlocutor_name: string;
    interlocutor_display_name?: string;
    interlocutor_is_online?: boolean;
    interlocutor_last_seen?: string | null;
    avatar_url?: string;
    interlocutor_deleted?: boolean;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: number | null;
    is_pinned?: boolean;
  }>;
}

export interface GroupChatResponse {
  groups: Array<{
    chat_id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: number | null;
    is_pinned?: boolean;
  }>;
}

export interface MessageHistoryResponse {
  history: Message[];
  has_more: boolean;
  next_before_id: number | null;
}

export interface UserAvatarHistoryItem {
  id: number;
  avatar_url: string;
  created_at: string;
  is_current: boolean;
}

export interface UserAvatarHistoryResponse {
  avatars: UserAvatarHistoryItem[];
}

export type PrivacyVisibility = 'everyone' | 'shared_chats' | 'nobody';
export type SearchVisibility = 'everyone' | 'nobody';

export interface PrivacySettings {
  avatar_visibility: PrivacyVisibility;
  profile_visibility: PrivacyVisibility;
  presence_visibility: PrivacyVisibility;
  read_receipts_enabled: boolean;
  direct_messages: PrivacyVisibility;
  group_invites: PrivacyVisibility;
  search_visibility: SearchVisibility;
}

export interface BlockedUsersResponse {
  users: User[];
}

export interface SecuritySettings {
  session_duration_days: number;
  two_factor_enabled: boolean;
  recovery_codes_remaining: number;
}

export interface UserSession {
  id: string;
  user_agent: string;
  ip_address?: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface UserSessionsResponse {
  sessions: UserSession[];
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_uri: string;
}

export interface TwoFactorConfirmResponse {
  message: string;
  recovery_codes: string[];
}

export const messengerApi = createApi({
  reducerPath: 'messengerApi',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['User', 'Chat', 'Message', 'Auth', 'Avatar', 'Privacy'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    loginTwoFactor: builder.mutation<AuthResponse, TwoFactorLoginRequest>({
      query: (payload) => ({
        url: '/auth/login/2fa',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Auth'],
    }),

    refreshSession: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),
    
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    getSecuritySettings: builder.query<SecuritySettings, void>({
      query: () => '/auth/me/security',
      providesTags: ['Auth'],
    }),

    updateSessionDuration: builder.mutation<SecuritySettings, number>({
      query: (sessionDurationDays) => ({
        url: '/auth/me/security/session-duration',
        method: 'PUT',
        body: { session_duration_days: sessionDurationDays },
      }),
      invalidatesTags: ['Auth'],
    }),

    getSessions: builder.query<UserSessionsResponse, void>({
      query: () => '/auth/me/sessions',
      providesTags: ['Auth'],
    }),

    revokeSession: builder.mutation<{ message: string }, string>({
      query: (sessionId) => ({
        url: `/auth/me/sessions/${encodeURIComponent(sessionId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    revokeOtherSessions: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/me/sessions/others',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: ({ currentPassword, newPassword }) => ({
        url: '/auth/me/password',
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
      }),
      invalidatesTags: ['Auth'],
    }),

    setupTwoFactor: builder.mutation<TwoFactorSetupResponse, void>({
      query: () => ({
        url: '/auth/me/2fa/setup',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    confirmTwoFactor: builder.mutation<TwoFactorConfirmResponse, string>({
      query: (code) => ({
        url: '/auth/me/2fa/confirm',
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ['Auth'],
    }),

    disableTwoFactor: builder.mutation<{ message: string }, { password: string; code: string }>({
      query: (payload) => ({
        url: '/auth/me/2fa/disable',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Auth'],
    }),

    getPrivacySettings: builder.query<PrivacySettings, void>({
      query: () => '/auth/me/privacy',
      providesTags: ['Privacy'],
    }),

    updatePrivacySettings: builder.mutation<PrivacySettings, Partial<PrivacySettings>>({
      query: (patch) => ({
        url: '/auth/me/privacy',
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
    }),

    getBlockedUsers: builder.query<BlockedUsersResponse, void>({
      query: () => '/auth/me/blocked-users',
      providesTags: ['Privacy'],
    }),

    blockUser: builder.mutation<{ message: string }, string>({
      query: (username) => ({
        url: `/auth/me/blocked-users/${encodeURIComponent(username)}`,
        method: 'POST',
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),

    unblockUser: builder.mutation<{ message: string }, string>({
      query: (username) => ({
        url: `/auth/me/blocked-users/${encodeURIComponent(username)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),
    
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),
    
    // Password recovery endpoints
    forgotUsername: builder.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/auth/recover',
        method: 'POST',
        body: data,
      }),
    }),
    
    resetPassword: builder.mutation<{ message: string }, { token: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    
    getCloudPart: builder.query<any, void>({
      query: () => '/auth/get-cloud-part',
    }),
    
    // User endpoints
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    
    searchUsers: builder.query<{ users: User[] }, string>({
      query: (searchTerm) => `/users/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: ['User'],
    }),
    
    getUserByUsername: builder.query<User, string>({
      query: (username) => `/users/users/${username}`,
      providesTags: (result, error, username) => [{ type: 'User', id: username }],
    }),
    
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    updateContactDisplayName: builder.mutation<User, { username: string; displayName?: string | null }>({
      query: ({ username, displayName }) => ({
        url: `/users/users/${encodeURIComponent(username)}/contact-name`,
        method: 'PUT',
        body: { display_name: displayName || '' },
      }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'User', id: username },
        'Chat',
        'Message',
      ],
    }),

    deleteContactDisplayName: builder.mutation<User, string>({
      query: (username) => ({
        url: `/users/users/${encodeURIComponent(username)}/contact-name`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, username) => [
        { type: 'User', id: username },
        'Chat',
        'Message',
      ],
    }),
    
    getUserAvatar: builder.query<{ avatar_url: string }, string>({
      query: (username) => `/users/avatar/${username}`,
      providesTags: (result, error, username) => [{ type: 'Avatar', id: username }],
    }),

    getUserAvatarHistory: builder.query<UserAvatarHistoryResponse, string>({
      query: (username) => `/users/users/${username}/avatars`,
      providesTags: (result, error, username) => [{ type: 'Avatar', id: `${username}-history` }],
    }),
    
    uploadUserAvatar: builder.mutation<{ message: string }, FormData>({
      query: (formData) => ({
        url: '/users/users/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Auth', 'Avatar'],
    }),
    
    updateUser: builder.mutation<User, Partial<User> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: `/auth/me`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'Auth'],
    }),
    
    updateUserBio: builder.mutation<{ message: string }, { bio: string }>({
      query: (data) => ({
        url: '/auth/me/bio',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    
    uploadAvatar: builder.mutation<{ message: string }, FormData>({
      query: (formData) => ({
        url: '/auth/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Auth'],
    }),
    
    deleteAccount: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),
    
    // Messages endpoints
    uploadFile: builder.mutation<{ message: string; filePath: string }, FormData>({
      query: (formData) => ({
        url: '/messages/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Message'],
    }),
    
    uploadVoiceMessage: builder.mutation<{ message: string; filePath: string }, FormData>({
      query: (formData) => ({
        url: '/messages/vm',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Message'],
    }),
    
    getMessageHistory: builder.query<MessageHistoryResponse, { chatId: number; limit?: number; beforeId?: number | null }>({
      query: ({ chatId, limit = 50, beforeId }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (beforeId) params.set('before_id', String(beforeId));
        return `/messages/history/${chatId}?${params.toString()}`;
      },
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: chatId }],
    }),

    // Chat endpoints
    getOneOnOneChats: builder.query<OneOnOneChatResponse, string>({
      query: (username) => `/chats/list/${username}`,
      providesTags: ['Chat'],
    }),
    
    getGroupChats: builder.query<GroupChatResponse, string>({
      query: (username) => `/groups/list/${username}`,
      providesTags: ['Chat'],
    }),
    
    getChatById: builder.query<Chat, number>({
      query: (id) => `/chats/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chat', id }],
    }),
    
    // Create one-on-one chat. Server expects { user1: string, user2: string }
    createChat: builder.mutation<{ chat_id: number; message: string }, { user1: string; user2: string }>({
      query: (chatData) => ({
        url: '/chats/create',
        method: 'POST',
        body: chatData,
      }),
      invalidatesTags: ['Chat'],
    }),
    
    updateChat: builder.mutation<Chat, { id: number; name?: string; description?: string }>({
      query: ({ id, ...patch }) => ({
        url: `/chats/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Chat', id }],
    }),
    
    deleteChat: builder.mutation<void, number>({
      query: (id) => ({
        url: `/chats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),

    setChatPinned: builder.mutation<{ chat_id: number; is_pinned: boolean }, { chatId: number; pinned: boolean }>({
      query: ({ chatId, pinned }) => ({
        url: `/chats/${chatId}/pin`,
        method: pinned ? 'PUT' : 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),
    
    // Message endpoints
    getMessages: builder.query<Message[], { chatId: number; page?: number; limit?: number }>({
      query: ({ chatId, page = 1, limit = 50 }) => 
        `/chats/${chatId}/messages?page=${page}&limit=${limit}`,
      providesTags: (result, error, { chatId }) => [
        { type: 'Message', id: chatId },
        ...(result ? result.map(({ id }) => ({ type: 'Message' as const, id })) : [])
      ],
    }),
    
    sendMessage: builder.mutation<Message, { chatId: number; content?: string; type: string; file?: File; replyTo?: number }>({
      query: ({ chatId, ...messageData }) => {
        const formData = new FormData();
        
        if (messageData.content) {
          formData.append('content', messageData.content);
        }
        formData.append('type', messageData.type);
        
        if (messageData.file) {
          formData.append('file', messageData.file);
        }
        
        if (messageData.replyTo) {
          formData.append('replyTo', messageData.replyTo.toString());
        }
        
        return {
          url: `/chats/${chatId}/messages`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { chatId }) => [
        { type: 'Message', id: chatId },
        'Chat' // Also invalidate chats to update last message
      ],
    }),
    
    updateMessage: builder.mutation<Message, { id: number; content: string }>({
      query: ({ id, content }) => ({
        url: `/messages/${id}`,
        method: 'PATCH',
        body: { content },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Message', id }],
    }),
    
    deleteMessage: builder.mutation<void, number>({
      query: (id) => ({
        url: `/messages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }],
    }),
    
    addReaction: builder.mutation<Message, { messageId: number; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [{ type: 'Message', id: messageId }],
    }),
    
    removeReaction: builder.mutation<Message, { messageId: number; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'DELETE',
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [{ type: 'Message', id: messageId }],
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  // Auth hooks
  useLoginMutation,
  useLoginTwoFactorMutation,
  useRefreshSessionMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useGetSecuritySettingsQuery,
  useUpdateSessionDurationMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
  useChangePasswordMutation,
  useSetupTwoFactorMutation,
  useConfirmTwoFactorMutation,
  useDisableTwoFactorMutation,
  useGetPrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useLogoutMutation,
  useForgotUsernameMutation,
  useResetPasswordMutation,
  
  // User hooks
  useGetUsersQuery,
  useSearchUsersQuery,
  useGetUserByUsernameQuery,
  useGetUserByIdQuery,
  useUpdateContactDisplayNameMutation,
  useDeleteContactDisplayNameMutation,
  useGetUserAvatarHistoryQuery,
  useUpdateUserMutation,
  useDeleteAccountMutation,
  
  // Chat hooks
  useGetOneOnOneChatsQuery,
  useGetGroupChatsQuery,
  useGetChatByIdQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useSetChatPinnedMutation,
  
  // Message hooks
  useGetMessagesQuery,
  useGetMessageHistoryQuery,
  useSendMessageMutation,
  useUploadFileMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} = messengerApi;
