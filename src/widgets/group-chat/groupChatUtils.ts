import type { GroupRole } from './GroupProfileTypes';
import { DEFAULT_AVATAR } from '@/shared/base/ui';

export const MESSAGE_PAGE_SIZE = 50;
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


export const permissionsForRole = (role?: GroupRole | null) => ({
  can_edit_group: role === 'owner' || role === 'admin',
  can_manage_participants: role === 'owner' || role === 'admin',
  can_assign_roles: role === 'owner' || role === 'admin',
  can_delete_any_message: role === 'owner' || role === 'admin' || role === 'moderator',
  can_delete_group: role === 'owner',
  can_transfer_ownership: role === 'owner',
});


const BASE_URL = import.meta.env.VITE_BASE_URL;
export const getAvatarSrc = (avatarUrl?: string | null) => {
  if (!avatarUrl) return `${BASE_URL}${DEFAULT_AVATAR}`;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};