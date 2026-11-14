import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupCreateForm } from './useGroupCreateForm';

const search = vi.hoisted(() => ({ users: [] as { id: string; username: string }[] }));
vi.mock('@/entities/user', () => ({ useSearchUsersQuery: (term: string) => ({ data: term.length >= 2 ? { users: search.users } : undefined, isFetching: false }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: { chats: [
    { id: 1, interlocutor_name: 'ada', interlocutor_display_name: 'Ada' },
    { id: 2, interlocutor_name: 'ben', interlocutor_display_name: 'Ben' },
    { id: 3, interlocutor_name: 'me', interlocutor_display_name: 'Me' },
  ] } }),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const renderForm = () => renderHook(() => useGroupCreateForm({ currentUsername: 'me', onCreate: vi.fn() }));

describe('useGroupCreateForm people', () => {
  it('shows recent chats first and only new people in search results', () => {
    search.users = [{ id: '10', username: 'ada' }, { id: '11', username: 'adam' }, { id: '12', username: 'me' }];
    const { result } = renderForm();
    expect(result.current.recentContacts.map((user) => user.username)).toEqual(['ada', 'ben']);
    act(() => result.current.setSearchTerm('@ad'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.recentContacts.map((user) => user.username)).toEqual(['ada']);
    expect(result.current.searchResults.map((user) => user.username)).toEqual(['adam']);
  });

  it('keeps selected people in the list and toggles them off again', () => {
    const { result } = renderForm();
    const ada = result.current.recentContacts[0];
    act(() => result.current.toggleUser(ada));
    expect(result.current.selectedUsers.map((user) => user.username)).toEqual(['ada']);
    expect(result.current.recentContacts.map((user) => user.username)).toContain('ada');
    act(() => result.current.toggleUser(ada));
    expect(result.current.selectedUsers).toEqual([]);
  });
});
