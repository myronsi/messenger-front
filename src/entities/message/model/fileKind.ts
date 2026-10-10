import type { FileMessageContent } from './types';

export type FileKind = 'image' | 'audio' | 'voice' | 'video' | 'file';

const IMAGE_NAME = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;

// How a file message is shown. The server's kind decides: it detects it from the content, so a file named
// .png that is not an image is a plain file. Only a message without one (an older copy) is judged by its
// type and name.
export const fileKindOf = (content: FileMessageContent): FileKind => {
  if (content.kind) return content.kind;
  const type = content.file_type || '';
  if (type === 'voice') return 'voice';
  if (type === 'image' || type.startsWith('image/') || IMAGE_NAME.test(content.file_name || '')) return 'image';
  if (type === 'video' || type.startsWith('video/')) return 'video';
  if (type === 'audio' || type.startsWith('audio/')) return 'audio';
  return 'file';
};
