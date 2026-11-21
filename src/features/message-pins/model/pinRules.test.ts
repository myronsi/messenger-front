import { describe, expect, it } from 'vitest';
import type { PinnedMessage } from '@/entities/message';
import { asksBeforePin, asksBeforeUnpin, nextPinIndex, pinScopes, unpinScopes } from './pinRules';

const pin = (scope: PinnedMessage['scope'], canUnpinForEveryone: boolean): PinnedMessage => ({
  message: { id: '10', sender: 'Anna', content: 'hi', timestamp: '', type: 'message', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: canUnpinForEveryone,
});

describe('pin scopes', () => {
  it('asks in a one-on-one chat', () => {
    const context = { kind: 'direct', peerName: 'Anna', personalOnly: false } as const;
    expect(pinScopes(context)).toEqual(['me', 'everyone']);
    expect(asksBeforePin(context)).toBe(true);
  });

  it('pins only for me in Saved Messages, requests and blocked chats', () => {
    const context = { kind: 'direct', peerName: 'Anna', personalOnly: true } as const;
    expect(pinScopes(context)).toEqual(['me']);
    expect(asksBeforePin(context)).toBe(false);
  });

  it.each([
    ['owner', ['me', 'everyone']],
    ['admin', ['me', 'everyone']],
    ['moderator', ['me', 'everyone']],
    ['member', ['me']],
    [null, ['me']],
  ])('gives a group %s the scopes %j', (role, scopes) => {
    expect(pinScopes({ kind: 'group', role })).toEqual(scopes);
    expect(asksBeforePin({ kind: 'group', role })).toBe(scopes.length > 1);
  });
});

describe('unpin scopes', () => {
  it('offers only the options the server allows', () => {
    expect(unpinScopes(pin('everyone', true))).toEqual(['me', 'everyone']);
    expect(unpinScopes(pin('everyone', false))).toEqual(['me']);
    expect(unpinScopes(pin('me', false))).toEqual(['me']);
  });

  it('asks only for a pin for everyone', () => {
    expect(asksBeforeUnpin(pin('everyone', false))).toBe(true);
    expect(asksBeforeUnpin(pin('me', false))).toBe(false);
  });
});

describe('bar cycling', () => {
  it('goes to the next older pin and back to the newest after the oldest', () => {
    expect(nextPinIndex(0, 3)).toBe(1);
    expect(nextPinIndex(2, 3)).toBe(0);
    expect(nextPinIndex(0, 0)).toBe(0);
  });
});
