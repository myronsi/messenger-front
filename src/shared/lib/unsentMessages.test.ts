import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_UNSENT_PER_CHAT, clearUnsentMessages, countUnsentMessages, readUnsentMessages, unsentMessagesId, writeUnsentMessages } from './unsentMessages';

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('unsent message storage', () => {
  it('keys unsent messages by account and saved chat only', () => {
    expect(unsentMessagesId('u1', '3')).toBe('u1:3');
    expect(unsentMessagesId(null, '3')).toBeNull();
    expect(unsentMessagesId('u1', -4)).toBeNull();
  });

  it('keeps the newest messages per chat and removes the entry when nothing is left', () => {
    writeUnsentMessages('u1:3', Array.from({ length: MAX_UNSENT_PER_CHAT + 2 }, (_, index) => index));
    const saved = readUnsentMessages<number>('u1:3');
    expect(saved).toHaveLength(MAX_UNSENT_PER_CHAT);
    expect(saved[0]).toBe(2);
    writeUnsentMessages('u1:3', []);
    expect(sessionStorage.getItem('unsent:u1:3')).toBeNull();
  });

  it('reads broken or missing data as empty', () => {
    sessionStorage.setItem('unsent:u1:3', '{broken');
    expect(readUnsentMessages('u1:3')).toEqual([]);
    expect(readUnsentMessages(null)).toEqual([]);
  });

  it('clears every account on logout but leaves other keys', () => {
    writeUnsentMessages('u1:3', [1]);
    writeUnsentMessages('u2:4', [2]);
    sessionStorage.setItem('draft:u1:chat:3', 'hi');
    clearUnsentMessages();
    expect(Object.keys(sessionStorage)).toEqual(['draft:u1:chat:3']);
  });

  it('ignores a full storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => writeUnsentMessages('u1:3', [1])).not.toThrow();
  });

  it('counts only messages of this account that the server never kept', () => {
    writeUnsentMessages('u1:3', [{ id: -1 }, { id: -2, server_kept: true }]);
    writeUnsentMessages('u1:4', [{ id: -3 }]);
    writeUnsentMessages('u2:3', [{ id: -4 }]);
    expect(countUnsentMessages('u1')).toBe(2);
    expect(countUnsentMessages(null)).toBe(0);
  });
});
