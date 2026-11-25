export const ACCOUNT_CLEARED_EVENT = 'messenger:account-cleared';

export const ACCOUNT_STORAGE_KEYS = [
  'messenger.recentEmoji',
  'chat-import:pending',
  'image_dimensions',
  'avatar-blur-v1',
];

export const ACCOUNT_STORAGE_PREFIXES = [
  'audio_library:',
  'audio_session:',
  'messenger.reactionUsage',
  'messenger.doubleTapReaction',
  'messenger:call-identities:',
  'messenger:notification-seen:',
  'passkey_offer_dismissed:',
];

export const isAccountStorageKey = (key: string) => (
  ACCOUNT_STORAGE_KEYS.includes(key) || ACCOUNT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
);

const removeAccountKeys = () => {
  try {
    Object.keys(localStorage).filter(isAccountStorageKey).forEach((key) => localStorage.removeItem(key));
  } catch {
    return;
  }
};

export const clearAccountStorage = () => {
  removeAccountKeys();
  window.dispatchEvent(new Event(ACCOUNT_CLEARED_EVENT));
  removeAccountKeys();
};

export const onAccountCleared = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(ACCOUNT_CLEARED_EVENT, listener);
  return () => window.removeEventListener(ACCOUNT_CLEARED_EVENT, listener);
};
