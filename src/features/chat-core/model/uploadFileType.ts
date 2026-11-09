import type { FileMessageContent } from '@/entities/message';

export const getLocalUploadFileType = (fileName: string, mimeType = '') => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'].includes(extension)) return 'image';
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.webm'].includes(extension)) return 'video';
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(extension)) return 'audio';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return 'document';
  if (extension === '.pptx') return 'presention';
  if (extension === '.zip') return 'arcive';
  if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(extension)) return 'code';
  return 'none';
};
export const createLocalFileContent = (files: readonly { file: Blob; fileName: string }[], caption: string, firstType?: string): FileMessageContent => {
  const items = files.map(({ file, fileName }) => ({
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

export const appendMessageFiles = (form: FormData, files: readonly { file: Blob; fileName: string }[]) => {
  for (const { file, fileName } of files) form.append('file', file, fileName);
};
