import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { snapshotPage, SNAPSHOT_SYNC_DELAY_MS, useHistorySnapshotSync } from './useHistorySnapshotSync';

const save = vi.hoisted(() => vi.fn());
vi.mock('@/entities/message', async (original) => ({ ...await original<typeof import('@/entities/message')>(), storeHistory: save }));

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'a', content: id, timestamp: '', type: 'message', read_by: [], ...extra,
});

describe('snapshotPage', () => {
  it('stores only server messages without local-only fields', () => {
    const page = snapshotPage([
      message('10', { local_object_url: 'blob:x', client_temp_id: '-1' }), message('11', { is_cached: true }), message('-5'),
    ], true);
    expect(page?.history.map((item) => item.id)).toEqual(['10']);
    expect(page?.history[0]).not.toHaveProperty('local_object_url');
    expect(page?.history[0]).not.toHaveProperty('client_temp_id');
    expect(page).toMatchObject({ has_more: true, next_before_id: '10', has_more_after: false });
  });
});

describe('useHistorySnapshotSync', () => {
  beforeEach(() => { vi.useFakeTimers(); save.mockReset(); });
  afterEach(() => vi.useRealTimers());

  it('saves the open chat a moment after its messages change', () => {
    const { rerender } = renderHook((props) => useHistorySnapshotSync(props), {
      initialProps: { chatId: '4', messages: [message('10')], enabled: true, hasMoreBefore: false },
    });
    rerender({ chatId: '4', messages: [message('10'), message('11')], enabled: true, hasMoreBefore: false });
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SNAPSHOT_SYNC_DELAY_MS);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toBe('4');
    expect(save.mock.calls[0][1].map((item: Message) => item.id)).toEqual(['10', '11']);
  });

  it('saves the pending change at once when the chat is left', () => {
    const { rerender } = renderHook((props) => useHistorySnapshotSync(props), {
      initialProps: { chatId: '4', messages: [message('10')], enabled: true, hasMoreBefore: false },
    });
    rerender({ chatId: '5', messages: [], enabled: false, hasMoreBefore: false });
    expect(save).toHaveBeenCalledWith('4', [expect.objectContaining({ id: '10' })]);
  });

  it('does not save a window that is not the newest part of the chat', () => {
    renderHook(() => useHistorySnapshotSync({ chatId: '4', messages: [message('10')], enabled: false, hasMoreBefore: true }));
    vi.advanceTimersByTime(SNAPSHOT_SYNC_DELAY_MS);
    expect(save).not.toHaveBeenCalled();
  });
});
