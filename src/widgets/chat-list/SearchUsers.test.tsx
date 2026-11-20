import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import SearchUsers from './SearchUsers';

const state = vi.hoisted(() => ({ users: [] as unknown[], groups: [] as unknown[] }));
vi.mock('@/entities/user', () => ({
  useSearchUsersQuery: (q: string, { skip }: { skip: boolean }) => ({
    currentData: skip ? undefined : { users: state.users }, isError: false, isFetching: false,
  }),
}));
vi.mock('@/entities/group', () => ({
  useSearchPublicGroupsQuery: (q: string, { skip }: { skip: boolean }) => ({ currentData: skip ? undefined : state.groups, isFetching: false }),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));

beforeEach(() => {
  vi.useFakeTimers();
  state.users = [];
  state.groups = [];
  window.history.replaceState({}, '', '/');
});
afterEach(() => vi.useRealTimers());

const search = (text: string) => {
  fireEvent.change(screen.getByPlaceholderText(en.searchUsers), { target: { value: text } });
  act(() => { vi.advanceTimersByTime(300); });
};

it('lists public groups next to people and opens a group at its public link', () => {
  state.groups = [{ group: { name: 'Hikers', public_name: 'hikers', description: null, avatar_url: null, member_count: 4 }, chat_id: null }];
  render(<SearchUsers currentUsername="me" translations={en} />);
  search('hik');
  expect(screen.getByText('Public groups')).toBeInTheDocument();
  expect(screen.queryByText(en.appShell.noPeopleFound)).toBeNull();
  fireEvent.click(screen.getByTestId('group-search-result'));
  expect(window.location.pathname).toBe('/@hikers');
});

it('says nothing was found only when there are neither people nor groups', () => {
  render(<SearchUsers currentUsername="me" translations={en} />);
  search('zzz');
  expect(screen.getByText(en.appShell.noPeopleFound)).toBeInTheDocument();
  expect(screen.queryByTestId('group-search-results')).toBeNull();
});
