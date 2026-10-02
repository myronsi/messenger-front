import type { GroupRole } from './GroupProfileTypes';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';


export const permissionsForRole = (role?: GroupRole | null) => ({
  can_edit_group: role === 'owner' || role === 'admin',
  can_manage_participants: role === 'owner' || role === 'admin',
  can_assign_roles: role === 'owner' || role === 'admin',
  can_delete_any_message: role === 'owner' || role === 'admin' || role === 'moderator',
  can_delete_group: role === 'owner',
  can_transfer_ownership: role === 'owner',
});


export const getAvatarSrc = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);