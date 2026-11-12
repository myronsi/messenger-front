import { describe, expect, it } from 'vitest';
import type { KeptSend, Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { keptErrorText, markServerKept, mergeServerUnsent } from './serverOutbox';

const confirmed: Message = { id: '10', sender: 'me', content: 'Hi', timestamp: '2026-11-12T10:00:00Z', type: 'message', is_own: true, read_by: [] };
const pending: Message = { ...confirmed, id: -5, client_temp_id: -5, content: 'Waiting' };
const kept = (tempId: number, content: string): KeptSend => ({
  tempId, code: 'forbidden', fields: { type: 'message', content, reply_to: null, timestamp: '2026-11-12T09:00:00Z' },
});
const toMessage = (send: KeptSend): Message => ({ ...confirmed, id: send.tempId, client_temp_id: send.tempId, ...send.fields, server_kept: true });

describe('server outbox', () => {
  it('adds kept sends from another device and marks the ones already on screen', () => {
    const merged = mergeServerUnsent([confirmed, pending], [kept(-5, 'Waiting'), kept(-7, 'From the phone')], toMessage);
    expect(merged.map((message) => message.id)).toEqual(['10', -5, -7]);
    expect(merged[1]).toMatchObject({ server_kept: true, content: 'Waiting' });
    expect(merged[1].delivery_error).toBeUndefined();
    expect(merged[2]).toMatchObject({ server_kept: true, content: 'From the phone' });
  });

  it('ignores a kept send whose message was already delivered', () => {
    const delivered = { ...confirmed, id: '11', client_temp_id: -5 };
    const current = [confirmed, delivered];
    expect(mergeServerUnsent(current, [kept(-5, 'Waiting')], toMessage)).toBe(current);
  });

  it('marks a send the server kept after a live error', () => {
    expect(markServerKept([confirmed, pending], -5)[1].server_kept).toBe(true);
  });

  it('names the reason of a kept send', () => {
    expect(keptErrorText('blocked_by_user', en)).toBe(en.messageNotDeliveredBlocked);
    expect(keptErrorText('forbidden', en)).toBe(en.messageNotDeliveredPrivacy);
    expect(keptErrorText('rate_limited', en)).toBe(en.messageRateLimited);
    expect(keptErrorText('internal_error', en)).toBe(en.messageDeliveryNotConfirmed);
  });
});
