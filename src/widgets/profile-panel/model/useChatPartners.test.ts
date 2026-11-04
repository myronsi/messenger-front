import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mergePartners, useChatPartners } from './useChatPartners';

const groups = vi.hoisted(() => ({ current: [] as { chat_id: string }[] }));
const dispatch = vi.hoisted(() => () => ({ unwrap: () => Promise.resolve({ participants: [{ username: 'gina' }] }), unsubscribe: () => undefined }));

vi.mock('@/entities/chat', () => ({
  chatApi: { endpoints: { getGroupDetails: { initiate: (id: string) => id } } },
  useGetGroupChatsQuery: () => ({ data: { groups: groups.current } }),
}));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => dispatch }));

describe('mergePartners', () => {
  it('joins direct and group partners once each, without yourself', () => {
    const direct = [{ username: 'Bob' }, { username: 'carol' }];
    const others = [{ username: 'bob', display_name: 'Bobby' }, { username: 'me' }, { username: 'dave' }];
    expect(mergePartners('Me', direct, others).map((person) => person.username)).toEqual(['Bob', 'carol', 'dave']);
  });
});

describe('useChatPartners', () => {
  it('forgets group members once the last group is gone', async () => {
    const direct: { username: string }[] = [];
    groups.current = [{ chat_id: '1' }];
    const { result, rerender } = renderHook(() => useChatPartners(true, 'me', direct));
    await waitFor(() => expect(result.current.map((person) => person.username)).toEqual(['gina']));
    groups.current = [];
    rerender();
    expect(result.current).toEqual([]);
  });
});
