import { apiClient } from './client';
import { collectPages, contractData } from './tasks';
import { userModel } from './goModels';

export const resolveUsername = async (username: string, signal?: AbortSignal) => contractData(await apiClient.GET('/usernames/{username}', {
  params: { path: { username } }, signal,
}));

export const listChats = (signal?: AbortSignal) => collectPages(async after => contractData(await apiClient.GET('/chats', {
  params: { query: { limit: 100, ...(after ? { after } : {}) } }, signal,
})));

export const userProfileByUsername = async (username: string, signal?: AbortSignal) => {
  const user = await resolveUsername(username, signal);
  const chats = await listChats(signal);
  return { ...userModel(user), direct_chat_id: chats.find(chat => chat.peer?.id === user.id)?.id };
};
