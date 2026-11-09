import type { Message, MessageAttachment } from './types';

export const isVideoAttachment = (file: MessageAttachment) =>
  file.file_type === 'video' || file.file_type?.startsWith('video/') ||
  ((!file.file_type || ['file', 'application/octet-stream'].includes(file.file_type)) &&
    /\.(mp4|mov|webm|avi|mkv)$/i.test(file.file_name));

export const isVisualMediaMessage = (message: Message) => (
  message.type === 'file' && typeof message.content !== 'string' && !!message.content.file_url &&
  (!!message.content.album?.length || isVideoAttachment(message.content))
);
