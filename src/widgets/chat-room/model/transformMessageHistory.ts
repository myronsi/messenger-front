import { Message } from '@/entities/message';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface ApiMessage {
  id: number;
  sender?: string;
  content?: unknown;
  timestamp: string;
  avatar_url?: string;
  reply_to?: number | null;
  is_deleted?: boolean;
  type?: string;
  reactions?: unknown;
  read_by?: unknown;
}

export const transformMessageHistory = (data: unknown): Message[] => {
  const history = (data as { history?: unknown } | null)?.history;
  if (!Array.isArray(history)) return [];
  try {
    return (history as ApiMessage[]).map((message) => ({
      id: message.id,
      sender: message.sender || '',
      content: message.type === 'file'
        ? (typeof message.content === 'string' ? JSON.parse(message.content) : message.content)
        : message.content || '',
      timestamp: message.timestamp,
      avatar_url: message.avatar_url ? `${BASE_URL}${message.avatar_url}` : '',
      reply_to: message.reply_to || null,
      is_deleted: !!message.is_deleted,
      type: message.type === 'file' ? 'file' : 'message',
      reactions: message.reactions ? JSON.parse(message.reactions as string) : [],
      read_by: message.read_by ? JSON.parse(message.read_by as string) : [],
    } as Message));
  } catch (error) {
    console.error('Failed to transform messagesData:', error, data);
    return [];
  }
};
