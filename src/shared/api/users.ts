import { apiClient } from './client';
import { collectPages, contractData } from './tasks';
import { userModel } from './goModels';

export const resolveUsername = async (username: string, signal?: AbortSignal) => contractData(await apiClient.GET('/usernames/{username}', {
  params: { path: { username } }, signal,
}));

export const listChats = (signal?: AbortSignal) => collectPages(async after => contractData(await apiClient.GET('/chats', {
  params: { query: { limit: 100, folder: 'all', ...(after ? { after } : {}) } }, signal,
})));

const RECENT_CHATS_MS = 30_000;
let recentChats: { at: number; promise: ReturnType<typeof listChats> } | undefined;
export const rememberChatList = (promise: ReturnType<typeof listChats>) => {
  recentChats = { at: Date.now(), promise };
  promise.catch(() => { if (recentChats?.promise === promise) recentChats = undefined; });
};
const chatsForProfile = () => {
  if (recentChats && Date.now() - recentChats.at <= RECENT_CHATS_MS) return recentChats.promise;
  const promise = listChats();
  rememberChatList(promise);
  return promise;
};

export const userProfileByUsername = async (username: string, signal?: AbortSignal) => {
  const user = await resolveUsername(username, signal);
  const chats = await chatsForProfile();
  return { ...userModel(user), direct_chat_id: chats.find(chat => chat.peer?.id === user.id)?.id };
};
