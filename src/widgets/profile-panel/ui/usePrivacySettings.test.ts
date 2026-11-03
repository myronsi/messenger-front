import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/entities/user';
import { usePrivacySettings } from './usePrivacySettings';

const saved = vi.hoisted(() => ({
  avatar_visibility: 'nobody',
  privacy_exceptions: { avatar_visibility: { allow: [{ id: '3', username: 'carol' }], deny: [{ id: '2', username: 'bob' }] } },
}));
const api = vi.hoisted(() => ({ calls: [] as string[], failSettings: false }));
const settingsMutation = vi.hoisted(() => [(body: object) => ({
  unwrap: () => {
    api.calls.push(`settings ${JSON.stringify(body)}`);
    return api.failSettings ? Promise.reject(new Error('down')) : Promise.resolve();
  },
}), { isLoading: false }]);
const exceptionsMutation = vi.hoisted(() => [({ effect, usernames }: { effect: string; usernames: string[] }) => ({
  unwrap: () => {
    api.calls.push(`${effect} ${usernames.join(',')}`);
    return Promise.resolve();
  },
}), { isLoading: false }]);

vi.mock('@/features/profile', () => ({
  useGetCurrentUserQuery: () => ({ data: { username: 'me' } }),
  useGetPrivacySettingsQuery: () => ({ data: saved, isLoading: false }),
  useUpdatePrivacySettingsMutation: () => settingsMutation,
  useUpdatePrivacyExceptionsMutation: () => exceptionsMutation,
}));
vi.mock('@/entities/chat', () => ({ useGetOneOnOneChatsQuery: () => ({ data: { chats: [] } }) }));
vi.mock('@/entities/user', () => ({
  useLazyGetUserByUsernameQuery: () => [vi.fn(), { isFetching: false }],
  useSearchUsersQuery: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

const person = (username: string) => ({ id: username, username }) as User;

beforeEach(() => {
  api.calls = [];
  api.failSettings = false;
});

describe('usePrivacySettings', () => {
  it('takes a person out of the opposite exception list', () => {
    const { result } = renderHook(() => usePrivacySettings(true));
    act(() => result.current.handleExceptionListChange('avatar_visibility', 'allow', [person('carol'), person('Bob')]));
    const lists = result.current.privacySettings?.privacy_exceptions.avatar_visibility;
    expect(lists?.allow.map((user) => user.username)).toEqual(['carol', 'Bob']);
    expect(lists?.deny).toEqual([]);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('saves new denials and removed allowances before widening the setting', async () => {
    const { result } = renderHook(() => usePrivacySettings(true));
    act(() => {
      result.current.handlePrivacyChange('avatar_visibility', 'everyone');
      result.current.handleExceptionListChange('avatar_visibility', 'deny', [person('bob'), person('eve')]);
      result.current.handleExceptionListChange('avatar_visibility', 'allow', []);
    });
    await act(async () => { await result.current.saveChanges(); });
    expect(api.calls).toEqual(['deny bob,eve', 'allow ', 'settings {"avatar_visibility":"everyone"}']);
  });

  it('widens nothing when the setting fails to save', async () => {
    const { result } = renderHook(() => usePrivacySettings(true));
    act(() => {
      result.current.handlePrivacyChange('avatar_visibility', 'everyone');
      result.current.handleExceptionListChange('avatar_visibility', 'deny', []);
      result.current.handleExceptionListChange('avatar_visibility', 'allow', [person('carol'), person('dan')]);
    });
    api.failSettings = true;
    let ok = true;
    await act(async () => { ok = await result.current.saveChanges(); });
    expect(ok).toBe(false);
    expect(api.calls).toEqual(['settings {"avatar_visibility":"everyone"}']);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});
