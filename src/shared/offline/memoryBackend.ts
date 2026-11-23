import type { ChatRecord, MediaRecord, MessageRecord, OfflineBackend } from './backend';

export const memoryBackend = (): OfflineBackend & { messageCount: () => number } => {
  const messages = new Map<string, MessageRecord>();
  const chats = new Map<string, ChatRecord>();
  const media = new Map<string, MediaRecord>();
  const meta = new Map<string, unknown>();
  const key = (chatId: string, id: string) => `${chatId}|${id}`;
  const ofChat = (chatId: string) => [...messages.values()].filter((m) => m.chatId === chatId).sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    messageCount: () => messages.size,
    putMessages: async (records) => { records.forEach((record) => messages.set(key(record.chatId, record.id), record)); },
    deleteMessages: async (chatId, ids) => { ids.forEach((id) => messages.delete(key(chatId, id))); },
    deleteUpTo: async (chatId, id) => { ofChat(chatId).filter((m) => m.id <= id).forEach((m) => messages.delete(key(chatId, m.id))); },
    deleteChat: async (chatId) => {
      ofChat(chatId).forEach((m) => messages.delete(key(chatId, m.id)));
      chats.delete(chatId);
    },
    readBefore: async (chatId, before, limit) => ofChat(chatId).filter((m) => before === null || m.id < before).reverse().slice(0, limit),
    readAfter: async (chatId, after, limit) => ofChat(chatId).filter((m) => m.id > after).slice(0, limit),
    getMessage: async (chatId, id) => messages.get(key(chatId, id)),
    byToken: async (token) => [...messages.values()].filter((m) => m.tokens.includes(token)).map(({ chatId, id }) => ({ chatId, id })),
    chats: async () => [...chats.values()],
    touchChat: async (chatId, openedAt) => { chats.set(chatId, { chatId, openedAt }); },
    ensureChat: async (chatId) => { if (!chats.has(chatId)) chats.set(chatId, { chatId, openedAt: 0 }); },
    putMedia: async (record) => { media.set(record.url, record); },
    getMedia: async (url) => media.get(url),
    touchMedia: async (url, usedAt) => {
      const record = media.get(url);
      if (record) media.set(url, { ...record, usedAt });
    },
    deleteMedia: async (urls) => { urls.forEach((url) => media.delete(url)); },
    mediaByAge: async () => [...media.values()].sort((a, b) => a.usedAt - b.usedAt).map(({ url, size }) => ({ url, size })),
    usage: async () => ({
      messages: [...messages.values()].reduce((total, m) => total + m.size, 0),
      media: [...media.values()].reduce((total, m) => total + m.size, 0),
    }),
    getMeta: async <T,>(name: string) => meta.get(name) as T | undefined,
    setMeta: async (name, value) => { meta.set(name, value); },
    clearData: async () => { messages.clear(); chats.clear(); media.clear(); },
    close: () => undefined,
  };
};
