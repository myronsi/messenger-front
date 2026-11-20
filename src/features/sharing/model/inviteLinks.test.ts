import { describe, expect, it } from 'vitest';
import { expiryFor, linkState, parseUseLimit } from './inviteLinks';

const now = Date.parse('2026-11-20T12:00:00Z');
const link = { is_active: true, revoked_at: null, expires_at: null, max_uses: null, use_count: 0 };

describe('expiryFor', () => {
  it('adds the chosen time or leaves the link open-ended', () => {
    expect(expiryFor('hour', now)).toBe('2026-11-20T13:00:00.000Z');
    expect(expiryFor('week', now)).toBe('2026-11-27T12:00:00.000Z');
    expect(expiryFor('month', now)).toBe('2026-12-20T12:00:00.000Z');
    expect(expiryFor('never', now)).toBeNull();
  });
});

describe('parseUseLimit', () => {
  it.each([['', null], ['  ', null], ['1', 1], [' 25 ', 25], ['100000', 100000]])('reads %j as %j', (text, value) => {
    expect(parseUseLimit(text)).toBe(value);
  });

  it.each(['0', '-1', '1.5', 'ten', '100001'])('refuses %j', (text) => {
    expect(parseUseLimit(text)).toBe('invalid');
  });
});

describe('linkState', () => {
  it('tells active, revoked, expired and used-up links apart', () => {
    expect(linkState(link, now)).toBe('active');
    expect(linkState({ ...link, revoked_at: '2026-11-19T00:00:00Z', is_active: false }, now)).toBe('revoked');
    expect(linkState({ ...link, expires_at: '2026-11-20T11:59:59Z' }, now)).toBe('expired');
    expect(linkState({ ...link, max_uses: 3, use_count: 3 }, now)).toBe('used_up');
    expect(linkState({ ...link, max_uses: 3, use_count: 2 }, now)).toBe('active');
  });
});
