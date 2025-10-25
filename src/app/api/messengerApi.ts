import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Define types for your API responses
export interface User {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: number;
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

export interface Chat {
  id: number;
  name?: string;
  type: 'private' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Define specific types for the API responses
export interface OneOnOneChatResponse {
  chats: Array<{
    id: number;
    interlocutor_name: string;
    avatar_url?: string;
    interlocutor_deleted?: boolean;
  }>;
}

export interface GroupChatResponse {
  groups: Array<{
    chat_id: number;
    name: string;
  }>;
}
export const messengerApi = createApi({
  reducerPath: 'messengerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // By default, if we have a token in localStorage, use it for authenticated requests
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Chat', 'Message', 'Auth', 'Avatar'],
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
    
    getUserByUsername: builder.query<{ avatar_url: string; bio: string }, string>({
      query: (username) => `/users/users/${username}`,
      providesTags: (result, error, username) => [{ type: 'User', id: username }],
    }),
    
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    getUserAvatar: builder.query<{ avatar_url: string }, string>({
      query: (username) => `/users/avatar/${username}`,
      providesTags: (result, error, username) => [{ type: 'Avatar', id: username }],
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
    
    getMessageHistory: builder.query<Message[], number>({
      query: (chatId) => `/messages/history/${chatId}`,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: chatId }],
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
  useRegisterMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useForgotUsernameMutation,
  useResetPasswordMutation,
  
  // User hooks
  useGetUsersQuery,
  useSearchUsersQuery,
  useGetUserByUsernameQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteAccountMutation,
  
  // Chat hooks
  useGetOneOnOneChatsQuery,
  useGetGroupChatsQuery,
  useGetChatByIdQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  
  // Message hooks
  useGetMessagesQuery,
  useGetMessageHistoryQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} = messengerApi;