import type { Sealed } from './cipher';

export interface MessageRecord {
  chatId: string;
  id: string;
  sealed: Sealed;
  size: number;
  tokens: string[];
}

export interface ChatRecord {
  chatId: string;
  openedAt: number;
}

export interface MediaRecord {
  url: string;
  sealed: Sealed;
  type: string;
  size: number;
  usedAt: number;
  expiresAt: number;
}

export interface OfflineBackend {
  putMessages(records: MessageRecord[]): Promise<void>;
  deleteMessages(chatId: string, ids: string[]): Promise<void>;
  deleteUpTo(chatId: string, id: string): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  readBefore(chatId: string, before: string | null, limit: number): Promise<MessageRecord[]>;
  readAfter(chatId: string, after: string, limit: number): Promise<MessageRecord[]>;
  getMessage(chatId: string, id: string): Promise<MessageRecord | undefined>;
  byToken(token: string): Promise<{ chatId: string; id: string }[]>;
  chats(): Promise<ChatRecord[]>;
  touchChat(chatId: string, openedAt: number): Promise<void>;
  ensureChat(chatId: string): Promise<void>;
  putMedia(record: MediaRecord): Promise<void>;
  getMedia(url: string): Promise<MediaRecord | undefined>;
  touchMedia(url: string, usedAt: number): Promise<void>;
  deleteMedia(urls: string[]): Promise<void>;
  mediaByAge(): Promise<{ url: string; size: number }[]>;
  usage(): Promise<{ messages: number; media: number }>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  clearData(): Promise<void>;
  close(): void;
}

export const padId = (id: string | number) => String(id).padStart(20, '0');
export const unpadId = (id: string) => id.replace(/^0+(?=\d)/, '');
