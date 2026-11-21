import { describe, expect, it } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import type { PinnedMessage, PinnedMessages } from '@/entities/message';
import { applyPinEvent } from './pinEvents';

const pin = (id: string, scope: PinnedMessage['scope'] = 'everyone'): PinnedMessage => ({
  message: { id, sender: 'Anna', content: `text ${id}`, timestamp: '', type: 'message', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: true,
});
const state: PinnedMessages = { items: [pin('20'), pin('10', 'me')], next_cursor: null, count: 2 };
const pinUpdate = (data: Record<string, unknown>, chatId = '5') => ({
  type: 'pin_update', event_id: '1', chat_id: chatId, data: { message_id: '20', actor_id: '2', at: '2026-11-21T10:00:00Z', ...data },
}) as unknown as ServerEvent;

describe('applyPinEvent', () => {
  it('ignores other chats and unrelated events', () => {
    expect(applyPinEvent(state, pinUpdate({ action: 'unpinned', scope: 'me' }, '6'), '5')).toBeNull();
    expect(applyPinEvent(state, { type: 'typing', event_id: '1', chat_id: '5', data: {} } as unknown as ServerEvent, '5')).toBeNull();
  });

  it('removes a pin hidden for me without reloading', () => {
    const effect = applyPinEvent(state, pinUpdate({ action: 'unpinned', scope: 'me', pinned_message_count: 1 }), '5');
    expect(effect?.next.items.map((item) => item.message.id)).toEqual(['10']);
    expect(effect).toMatchObject({ reload: false, next: { count: 1 } });
  });

  it('reloads after an unpin for everyone, which may leave my own pin', () => {
    expect(applyPinEvent(state, pinUpdate({ action: 'unpinned', scope: 'everyone' }), '5')?.reload).toBe(true);
  });

  it('reloads for a new pin and skips one it already knows', () => {
    expect(applyPinEvent(state, pinUpdate({ action: 'pinned', scope: 'everyone', message_id: '30' }), '5')?.reload).toBe(true);
    expect(applyPinEvent(state, pinUpdate({ action: 'pinned', scope: 'everyone' }), '5')?.reload).toBe(false);
    expect(applyPinEvent(state, pinUpdate({ action: 'pinned', scope: 'everyone', message_id: '10' }), '5')?.reload).toBe(true);
  });

  it('applies edits, deletes and cleared history', () => {
    const edit = {
      type: 'edit', event_id: '1', chat_id: '5',
      data: { message: { id: '20', type: 'text', content: 'edited', created_at: '', reactions: [], sender: { id: '2', display_name: 'Anna' } } },
    } as unknown as ServerEvent;
    expect(applyPinEvent(state, edit, '5')?.next.items[0].message.content).toBe('edited');
    const remove = { type: 'delete', event_id: '1', chat_id: '5', data: { message_id: '20' } } as unknown as ServerEvent;
    expect(applyPinEvent(state, remove, '5')?.next.items.map((item) => item.message.id)).toEqual(['10']);
    const cleared = { type: 'history_cleared', event_id: '1', chat_id: '5', data: { before_message_id: '15' } } as unknown as ServerEvent;
    expect(applyPinEvent(state, cleared, '5')?.next.items.map((item) => item.message.id)).toEqual(['20']);
  });
});
