import type { Message, MessageAttachment } from './types';

type AttachmentInfo = Pick<MessageAttachment, 'file_type' | 'file_name'> & Partial<MessageAttachment>;

const GENERIC_TYPES = ['', 'file', 'none', 'application/octet-stream'];
const AUDIO_NAME = /\.(opus|mp3|wav|ogg|oga|m4a|aac|flac|weba)$/i;
const VIDEO_NAME = /\.(mp4|mov|webm|avi|mkv)$/i;

const hasGenericType = (file: AttachmentInfo) => GENERIC_TYPES.includes(file.file_type || '');

export const isAudioAttachment = (file: AttachmentInfo) => {
  if (file.kind === 'audio' || file.kind === 'voice') return true;
  const type = file.file_type || '';
  if (type === 'voice' || type === 'audio' || type.startsWith('audio/')) return true;
  return !file.kind && hasGenericType(file) && AUDIO_NAME.test(file.file_name);
};

export const isVoiceAttachment = (file: AttachmentInfo) =>
  file.kind === 'voice' || file.file_type === 'voice' || (!file.kind && /\.opus$/i.test(file.file_name));

export const isVideoAttachment = (file: AttachmentInfo) => {
  if (file.kind) return file.kind === 'video';
  if (isAudioAttachment(file)) return false;
  return file.file_type === 'video' || !!file.file_type?.startsWith('video/') || (hasGenericType(file) && VIDEO_NAME.test(file.file_name));
};

export type AttachmentView = 'audio' | 'video' | 'image' | 'file';

export const attachmentView = (file: AttachmentInfo, hasPictureName: boolean): AttachmentView => {
  if (isAudioAttachment(file)) return 'audio';
  if (isVideoAttachment(file)) return 'video';
  if (file.kind === 'image' || hasPictureName) return 'image';
  return 'file';
};

export const isVisualMediaMessage = (message: Message) => (
  message.type === 'file' && typeof message.content !== 'string' && !!message.content.file_url &&
  (!!message.content.album?.length || isVideoAttachment(message.content))
);
