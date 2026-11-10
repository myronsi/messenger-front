import type { FileMessageContent } from '@/entities/message';
import type { Drawing } from '@/shared/ui/drawing';

export interface UploadFile {
  file: Blob;
  fileName: string;
  drawing?: Drawing;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.flac', '.weba'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];

export const getLocalUploadFileType = (fileName: string, mimeType = '') => {
  const dot = fileName.lastIndexOf('.');
  const extension = dot < 0 ? '' : fileName.slice(dot).toLowerCase();
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return 'document';
  if (extension === '.pptx') return 'presention';
  if (extension === '.zip') return 'arcive';
  if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(extension)) return 'code';
  return 'none';
};
export const createLocalFileContent = (files: readonly UploadFile[], caption: string, firstType?: string): FileMessageContent => {
  const items = files.map(({ file, fileName, drawing }) => ({
    drawing,
    file_url: URL.createObjectURL(file),
    file_name: fileName,
    file_type: getLocalUploadFileType(fileName, file.type),
    file_size: file.size,
  }));
  return {
    ...items[0],
    file_type: firstType ?? items[0].file_type,
    ...(caption.trim() ? { caption: caption.trim() } : {}),
    ...(items.length > 1 ? { album: items } : {}),
  };
};

export const appendMessageFiles = (form: FormData, files: readonly UploadFile[]) => {
  for (const { file, fileName } of files) form.append('file', file, fileName);
  if (files.some((item) => item.drawing)) form.append('drawings', JSON.stringify(files.map((item) => item.drawing ?? null)));
};
