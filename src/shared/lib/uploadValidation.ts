const MB = 1024 * 1024;
export const MAX_ALBUM_ITEMS = 10;

export type UploadKind = 'image' | 'audio' | 'video' | 'file';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
const ALBUM_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

export const UPLOAD_LIMIT_BYTES: Record<UploadKind, number> = {
  image: 20 * MB,
  audio: 25 * MB,
  video: 100 * MB,
  file: 100 * MB,
};

const ALLOWED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS, 'bmp', 'avif', 'heic', 'heif', 'svg',
  ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS,
  'pdf', 'doc', 'docx', 'rtf', 'txt', 'md', 'csv', 'json', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', '7z', 'rar', 'tar', 'gz',
  'js', 'ts', 'py', 'java', 'cpp', 'html', 'css',
] as const;

export const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export type UploadValidationError = 'tooLarge' | 'unsupportedType';

export const getExtension = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
};

export const isAlbumFile = (file: Pick<File, 'name'>) => ALBUM_EXTENSIONS.includes(getExtension(file.name));

export const uploadKindOf = (fileName: string): UploadKind => {
  const extension = getExtension(fileName);
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  return 'file';
};

export const uploadLimitBytes = (fileName: string) => UPLOAD_LIMIT_BYTES[uploadKindOf(fileName)];

export const uploadLimitMegabytes = (fileName: string) => uploadLimitBytes(fileName) / MB;

export const validateUploadFile = (file: Pick<File, 'name' | 'size'>): UploadValidationError | null => {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(getExtension(file.name))) return 'unsupportedType';
  if (file.size > uploadLimitBytes(file.name)) return 'tooLarge';
  return null;
};
