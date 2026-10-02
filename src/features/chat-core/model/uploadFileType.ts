export const getLocalUploadFileType = (fileName: string, mimeType = '') => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'].includes(extension)) return 'image';
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.ogg'].includes(extension)) return 'video';
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(extension)) return 'audio';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return 'document';
  if (extension === '.pptx') return 'presention';
  if (extension === '.zip') return 'arcive';
  if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(extension)) return 'code';
  return 'none';
};