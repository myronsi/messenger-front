import type { components } from './generated/schema';

type Schema = components['schemas'];

// Keep transport IDs as decimal strings. Converting Snowflakes to Number loses bits.
export const userModel = (user: Schema['User']) => ({
  ...user,
  account_display_name: user.display_name,
  contact_display_name: user.contact_name,
  display_name: user.contact_name || user.display_name,
  avatar_url: user.avatar_url || undefined,
  bio: user.bio || undefined,
  can_message: !user.is_deleted,
});

export const messageModel = (message: Schema['Message']) => ({
  ...message,
  sender_id: message.sender?.id,
  sender: message.sender?.display_name || 'System',
  sender_username: message.sender?.username,
  avatar_url: message.sender?.avatar_url || undefined,
  timestamp: message.created_at,
  type: message.attachment ? 'file' as const : 'message' as const,
  content: message.attachment ? {
    file_url: message.attachment.url,
    file_name: message.attachment.filename,
    file_type: message.attachment.kind === 'voice' ? 'voice' : message.attachment.content_type,
    file_size: message.attachment.size,
    caption: message.content || undefined,
    image_width: message.attachment.width || undefined,
    image_height: message.attachment.height || undefined,
    thumbnail_url: message.attachment.thumbnail_url || undefined,
    audio_metadata: {
      duration: (message.attachment.duration_ms || 0) / 1000,
      waveform: message.attachment.waveform || undefined,
    },
  } : message.content || '',
  reactions: message.reactions.map(({ emoji, user_id }) => ({ reaction: emoji, user_id })),
});

export const directChatModel = (chat: Schema['Chat']) => ({
  ...chat,
  interlocutor_name: chat.peer?.username || '',
  interlocutor_display_name: chat.peer?.contact_name || chat.peer?.display_name || chat.name,
  interlocutor_is_online: chat.peer?.is_online,
  interlocutor_last_seen: chat.peer?.last_seen,
  interlocutor_deleted: chat.peer?.is_deleted || false,
  avatar_url: chat.avatar_url || undefined,
  last_message: chat.last_message ? {
    ...messageModel(chat.last_message),
    sender_id: chat.last_message.sender?.id || '0',
    sender_name: chat.last_message.sender?.display_name || 'System',
  } : null,
});

export const groupChatModel = (chat: Schema['Chat']) => ({
  ...directChatModel(chat),
  chat_id: chat.id,
});

export const groupModel = (group: Schema['Group']) => ({
  ...group,
  chat_id: group.id,
  description: group.description || undefined,
  avatar_url: group.avatar_url || undefined,
  current_user_role: group.my_role,
  participants: group.members.map(({ user, role }) => ({ ...userModel(user), role })),
});
