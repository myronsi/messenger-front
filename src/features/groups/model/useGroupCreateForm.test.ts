import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupCreateForm } from './useGroupCreateForm';

const search = vi.hoisted(() => ({ users: [] as { id: string; username: string }[] }));
vi.mock('@/entities/user', () => ({ useSearchUsersQuery: (term: string) => ({ data: term.length >= 2 ? { users: search.users } : undefined, isFetching: false }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: { chats: [
    { id: 1, interlocutor_name: 'ada', interlocutor_display_name: 'Ada' },
    { id: 2, interlocutor_name: 'ben', interlocutor_display_name: 'Ben' },
  ] } }),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useGroupCreateForm contacts', () => {
  it('lists a direct-message contact only once while searching', () => {
    search.users = [{ id: '10', username: 'ada' }];
    const { result } = renderHook(() => useGroupCreateForm({ currentUsername: 'me', onCreate: vi.fn() }));
    expect(result.current.dmContactSuggestions.map((user) => user.username)).toEqual(['ada', 'ben']);
    act(() => result.current.setSearchTerm('ad'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.dmContactSuggestions).toEqual([]);
  });
});
