// Checks a file before it is uploaded, with the limits of the backend (media.DefaultLimits of
// messenger-back), so a file that cannot be stored fails at once with a clear reason. The server still
// decides: it detects the type from the content and answers 413 or 415 with its own reason.

const MB = 1024 * 1024;

export type UploadKind = 'image' | 'audio' | 'video' | 'file';

export const UPLOAD_LIMITS: Record<UploadKind | 'avatar', number> = {
  image: 20 * MB,
  audio: 25 * MB,
  video: 100 * MB,
  file: 100 * MB,
  avatar: 10 * MB,
};

// Avatars must be images the server can decode and resize.
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',');

export type UploadValidationError =
  | { reason: 'empty' }
  | { reason: 'tooLarge'; limitBytes: number }
  | { reason: 'unsupportedType' };

// The kind the server will most likely detect; any other file is stored as a plain file.
export const uploadKindOf = (contentType: string): UploadKind => {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return 'file';
};

export const validateUploadFile = (
  file: Pick<File, 'size' | 'type'>,
  purpose: 'message' | 'avatar' = 'message',
): UploadValidationError | null => {
  if (file.size === 0) return { reason: 'empty' };
  if (purpose === 'avatar' && !(AVATAR_TYPES as readonly string[]).includes(file.type)) return { reason: 'unsupportedType' };
  const limitBytes = purpose === 'avatar' ? UPLOAD_LIMITS.avatar : UPLOAD_LIMITS[uploadKindOf(file.type)];
  return file.size > limitBytes ? { reason: 'tooLarge', limitBytes } : null;
};

// "20 MB", for messages about a limit.
export const formatMegabytes = (bytes: number) => `${Math.round(bytes / MB)} MB`;
