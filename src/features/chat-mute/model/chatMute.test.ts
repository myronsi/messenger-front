import { describe, expect, it } from 'vitest';
import { formatMuteUntil, getChatMute } from './chatMute';

const now = Date.parse('2026-11-02T10:00:00Z');
const settings = (until: string) => ({
  preferences: { enabled: true, sound: true, previews: false },
  mutes: [{ chat_id: '9007199254740993', until }],
  web_push: true, android_push: false, ios_push: false, vapid_public_key: '',
});

describe('getChatMute', () => {
  it('finds a running mute by exact chat id', () => {
    expect(getChatMute(settings('2026-11-02T11:00:00Z'), '9007199254740993', now)).toEqual({ until: new Date('2026-11-02T11:00:00Z'), forever: false });
    expect(getChatMute(settings('2026-11-02T11:00:00Z'), '9007199254740992', now)).toBeNull();
  });

  it('treats an expired mute as not muted', () => {
    expect(getChatMute(settings('2026-11-02T09:59:00Z'), '9007199254740993', now)).toBeNull();
  });

  it('recognises the backend value for "until I turn it back on"', () => {
    expect(getChatMute(settings('9999-01-01T00:00:00Z'), '9007199254740993', now)?.forever).toBe(true);
  });

  it('returns nothing before the settings are loaded', () => {
    expect(getChatMute(null, '1', now)).toBeNull();
  });
});

describe('formatMuteUntil', () => {
  it('shows only the time today and the date on other days', () => {
    const today = new Date(2026, 10, 2, 9, 0);
    expect(formatMuteUntil(new Date(2026, 10, 2, 14, 30), 'en', today)).toBe('14:30');
    expect(formatMuteUntil(new Date(2026, 10, 3, 9, 5), 'en', today)).toMatch(/3 Nov.*09:05/);
  });
});
