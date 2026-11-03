import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@/entities/user';
import { useProfileAccountActions } from './useProfileAccountActions';

const mutation = vi.hoisted(() => [() => ({ unwrap: () => Promise.resolve() }), { isLoading: false }]);
vi.mock('@/features/profile', () => ({ useDeleteAccountMutation: () => mutation }));
vi.mock('@/features/auth', () => ({ useLogoutMutation: () => mutation }));
vi.mock('@/entities/user', () => ({ useDeleteMyAvatarMutation: () => mutation }));
vi.mock('@/shared/auth/session', () => ({ authFetch: vi.fn(), endSession: vi.fn() }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

const user = (extra: Partial<User> = {}) => ({ id: '1', username: 'ann', display_name: 'Ann', bio: 'hi', ...extra }) as User;
const args = (userData: User) => ({ userData, refetchCurrentUser: vi.fn(async () => undefined), onClose: vi.fn(), onLogout: vi.fn() });

describe('useProfileAccountActions', () => {
  it('keeps unsaved name and bio drafts when the user is refetched after an avatar upload', () => {
    const { result, rerender } = renderHook((props) => useProfileAccountActions(props), { initialProps: args(user()) });
    act(() => {
      result.current.setNewDisplayName('Annie');
      result.current.setNewBio('new bio');
    });
    rerender(args(user({ avatar_url: '/new.png' })));
    expect(result.current.newDisplayName).toBe('Annie');
    expect(result.current.newBio).toBe('new bio');
  });

  it('follows the saved values while nothing is edited', () => {
    const { result, rerender } = renderHook((props) => useProfileAccountActions(props), { initialProps: args(user()) });
    rerender(args(user({ bio: 'saved elsewhere' })));
    expect(result.current.newBio).toBe('saved elsewhere');
  });
});
