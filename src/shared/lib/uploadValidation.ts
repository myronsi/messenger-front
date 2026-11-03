const MB = 1024 * 1024;
const VIDEO_EXTENSIONS = ['mp4', 'mov'];
const VIDEO_LIMIT_BYTES = 100 * MB;
const FILE_LIMIT_BYTES = 10 * MB;

// Mirrors the extensions the backend accepts for the file picker (messenger-back /messages/upload).
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif',
  'mp4', 'mov', 'ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac',
  'pdf', 'doc', 'docx', 'txt', 'pptx', 'zip',
  'js', 'ts', 'py', 'java', 'cpp', 'html', 'css',
] as const;

export const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export type UploadValidationError = 'tooLarge' | 'unsupportedType';

const getExtension = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
};

export const uploadLimitBytes = (fileName: string) => {
  return VIDEO_EXTENSIONS.includes(getExtension(fileName)) ? VIDEO_LIMIT_BYTES : FILE_LIMIT_BYTES;
};

export const uploadLimitMegabytes = (fileName: string) => uploadLimitBytes(fileName) / MB;

export const validateUploadFile = (file: Pick<File, 'name' | 'size'>): UploadValidationError | null => {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(getExtension(file.name))) return 'unsupportedType';
  if (file.size > uploadLimitBytes(file.name)) return 'tooLarge';
  return null;
};
