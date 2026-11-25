import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_CLEARED_EVENT, clearAccountStorage, isAccountStorageKey, onAccountCleared } from './accountStorage';

const accountKeys = [
  'messenger.recentEmoji', 'chat-import:pending', 'image_dimensions', 'avatar-blur-v1', 'audio_library:7', 'audio_session:7',
  'messenger.reactionUsage.7', 'messenger.doubleTapReaction.7', 'messenger:call-identities:7', 'messenger:notification-seen:7',
  'passkey_offer_dismissed:mai',
];
const deviceKeys = ['messenger:theme', 'language', 'messenger:appearance', 'messenger.videoPlayer', 'messenger-offline-cap', 'dismissed_update'];

describe('account storage', () => {
  afterEach(() => localStorage.clear());

  it('removes what belongs to the signed-in account and keeps device preferences', () => {
    [...accountKeys, ...deviceKeys].forEach((key) => localStorage.setItem(key, 'x'));

    clearAccountStorage();

    accountKeys.forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    deviceKeys.forEach((key) => expect(localStorage.getItem(key)).toBe('x'));
  });

  it('lets modules drop their in-memory copies and removes anything they write back while stopping', () => {
    const listener = vi.fn(() => localStorage.setItem('audio_session:7', 'last position'));
    const stop = onAccountCleared(listener);

    clearAccountStorage();
    stop();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('audio_session:7')).toBeNull();
    window.dispatchEvent(new Event(ACCOUNT_CLEARED_EVENT));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('recognises account keys by name', () => {
    expect(isAccountStorageKey('audio_library:42')).toBe(true);
    expect(isAccountStorageKey('messenger:theme')).toBe(false);
  });
});
