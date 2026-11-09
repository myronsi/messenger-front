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

const attachmentModel = (attachment: Schema['Attachment']) => ({
  file_url: attachment.url,
  file_name: attachment.filename,
  file_type: attachment.kind === 'voice' ? 'voice' : attachment.content_type,
  file_size: attachment.size,
  image_width: attachment.width || undefined,
  image_height: attachment.height || undefined,
  thumbnail_url: attachment.thumbnail_url || undefined,
  audio_metadata: {
    duration: (attachment.duration_ms || 0) / 1000,
    waveform: attachment.waveform || undefined,
  },
});

const contentModel = ({ attachment, attachments, content }: Pick<Schema['Message'], 'attachment' | 'attachments' | 'content'>) => {
  const first = attachments?.[0] ?? attachment;
  if (!first) return content || '';
  return { ...attachmentModel(first), caption: content || undefined, album: attachments?.map(attachmentModel) };
};

export const replyPreviewModel = (preview: Schema['ReplyPreview']) => ({
  id: preview.id,
  sender_id: preview.sender?.id,
  sender: preview.sender?.display_name || 'System',
  sender_username: preview.sender?.username,
  timestamp: '',
  type: preview.type === 'file' || preview.type === 'voice' ? 'file' as const : 'message' as const,
  content: contentModel(preview),
  is_deleted: preview.is_deleted,
  read_by: [],
});

export const messageModel = (message: Schema['Message']) => ({
  ...message,
  sender_id: message.sender?.id,
  sender: message.sender?.display_name || 'System',
  sender_username: message.sender?.username,
  avatar_url: message.sender?.avatar_url || undefined,
  timestamp: message.created_at,
  type: message.type === 'file' || message.type === 'voice' ? 'file' as const : 'message' as const,
  content: contentModel(message),
  is_system: message.type === 'system',
  reply_preview: message.reply_preview ? replyPreviewModel(message.reply_preview) : undefined,
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

export const groupModel = (group: Schema['Group']) => {
  const owner = group.members.find(({ user }) => user.id === group.owner_id)?.user;
  return {
    ...group,
    chat_id: group.id,
    owner_username: owner?.username,
    owner_display_name: owner?.display_name,
    description: group.description || undefined,
    avatar_url: group.avatar_url || undefined,
    current_user_role: group.my_role,
    participants: group.members.map(({ user, role }) => ({ ...userModel(user), role })),
  };
};
