const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

// Exponential backoff with jitter, so a server restart is not hit by every client at the same moment.
export const reconnectDelay = (attempt: number, random = Math.random) => {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
};

// 1008 means the server rejected the socket (no access to the chat, session ended); retrying cannot help.
export const shouldReconnect = (closeCode: number) => closeCode !== 1008;

// Calls `retry` when the browser comes back online or the tab becomes visible again,
// so a socket that dropped while the device slept reconnects without waiting for the backoff.
export const onConnectivityRestored = (retry: () => void) => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') retry();
  };
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    window.removeEventListener('online', retry);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
};
