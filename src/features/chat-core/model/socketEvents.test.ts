import { describe, expect, it } from 'vitest';
import { parseServerEvent } from './socketEvents';

describe('parseServerEvent', () => {
  it.each([null, undefined, 'text', 42, [], {}, { type: 5 }])('rejects %j', (raw) => {
    expect(parseServerEvent(raw)).toBeNull();
  });

  it('accepts a well-formed message event', () => {
    const raw = { type: 'message', data: { message_id: 7, content: 'hi' }, username: 'bob', timestamp: 't' };
    expect(parseServerEvent(raw)).toBe(raw);
  });

  it.each(['message', 'file'])('rejects %s events without a numeric message_id', (type) => {
    expect(parseServerEvent({ type, data: {} })).toBeNull();
    expect(parseServerEvent({ type, data: { message_id: '7' } })).toBeNull();
    expect(parseServerEvent({ type })).toBeNull();
  });

  it('passes other known events through', () => {
    const raw = { type: 'delete', message_id: 3 };
    expect(parseServerEvent(raw)).toBe(raw);
  });

  // MINOR contract updates may add fields and event types; the client must keep working.
  it('keeps events that carry unknown extra fields', () => {
    const raw = { type: 'delete', message_id: 3, added_in_a_minor_release: { nested: true } };
    expect(parseServerEvent(raw)).toBe(raw);
  });

  it('maps unhandled types to an unknown event', () => {
    expect(parseServerEvent({ type: 'something_new' })).toEqual({ type: 'unknown', rawType: 'something_new' });
  });
});