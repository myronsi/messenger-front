export const formatCountdown = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const countdownProgress = (remaining: number, total: number) => (
  total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0
);

export const receivedRemainingMs = (expiresAt: string, ttlMs: number, receivedAt = Date.now()) => {
  const remaining = Date.parse(expiresAt) - receivedAt;
  return remaining > 0 && remaining <= ttlMs ? remaining : ttlMs;
};

export const localDeadline = (expiresAt: string, ttlMs: number, receivedAt = Date.now()) => (
  receivedAt + receivedRemainingMs(expiresAt, ttlMs, receivedAt)
);

export const secondsUntil = (deadline: number, now = Date.now()) => Math.max(0, Math.ceil((deadline - now) / 1000));
