import { renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupDetails } from './GroupProfileTypes';
import type { RawGroupDetails } from './groupChatTypes';
import { useGroupDetails } from './useGroupDetails';

const state = vi.hoisted(() => ({
  latest: undefined as unknown,
  stored: undefined as unknown,
  storeValue: vi.fn(),
}));

vi.mock('@/entities/chat', () => ({
  useGetGroupDetailsQuery: () => ({ data: state.latest, error: undefined, refetch: vi.fn() }),
}));
vi.mock('@/shared/api/offlineStore', () => ({
  groupByIdKey: (id: string) => `group:id:${id}`,
  useStoredValue: (key: string | null) => (key === 'group:id:31' ? state.stored : undefined),
  storeValue: state.storeValue,
}));

const raw = (name: string): RawGroupDetails => ({
  chat_id: '31', name, participants: [{ id: '1', username: 'me', role: 'owner' }], current_user_role: 'owner',
} as unknown as RawGroupDetails);

const dispatch = vi.fn();

const render = () => renderHook(() => {
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const result = useGroupDetails({
    chatId: '31', username: 'me', groupName: 'Team', token: 't', dispatch: dispatch as never,
    groupDetails, groupForm, setGroupDetails, setGroupForm,
  });
  return { ...result, groupDetails };
});

beforeEach(() => {
  state.latest = undefined;
  state.stored = undefined;
  state.storeValue.mockReset();
});

describe('useGroupDetails cache', () => {
  it('shows the cached group while the fresh one is loading', () => {
    state.stored = raw('Cached team');
    const { result } = render();
    expect(result.current.groupDetails?.name).toBe('Cached team');
    expect(result.current.groupDetails?.current_user_role).toBe('owner');
  });

  it('prefers the fresh group over the cached one', () => {
    state.stored = raw('Cached team');
    state.latest = raw('Fresh team');
    const { result } = render();
    expect(result.current.groupDetails?.name).toBe('Fresh team');
  });

  it('saves live updates to the cache', () => {
    const { result } = render();
    result.current.applyGroupDetails(raw('Renamed'));
    expect(state.storeValue).toHaveBeenCalledWith('group:id:31', expect.objectContaining({ name: 'Renamed' }));
  });
});
