import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@/entities/user';
import { usePrivacySettings } from './usePrivacySettings';

const saved = vi.hoisted(() => ({
  avatar_visibility: 'everyone',
  privacy_exceptions: { avatar_visibility: { allow: [], deny: [{ id: '2', username: 'bob' }] } },
}));
const mutation = vi.hoisted(() => [() => ({ unwrap: () => Promise.resolve() }), { isLoading: false }]);

vi.mock('@/features/profile', () => ({
  useGetCurrentUserQuery: () => ({ data: { username: 'me' } }),
  useGetPrivacySettingsQuery: () => ({ data: saved, isLoading: false }),
  useUpdatePrivacySettingsMutation: () => mutation,
  useUpdatePrivacyExceptionsMutation: () => mutation,
}));
vi.mock('@/entities/chat', () => ({ useGetOneOnOneChatsQuery: () => ({ data: { chats: [] } }) }));
vi.mock('@/entities/user', () => ({
  useLazyGetUserByUsernameQuery: () => [vi.fn(), { isFetching: false }],
  useSearchUsersQuery: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

describe('usePrivacySettings', () => {
  it('takes a person out of the opposite exception list', () => {
    const { result } = renderHook(() => usePrivacySettings(true));
    act(() => result.current.handleExceptionListChange('avatar_visibility', 'allow', [{ id: '2', username: 'Bob' } as User]));
    const lists = result.current.privacySettings?.privacy_exceptions.avatar_visibility;
    expect(lists?.allow.map((user) => user.username)).toEqual(['Bob']);
    expect(lists?.deny).toEqual([]);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});
