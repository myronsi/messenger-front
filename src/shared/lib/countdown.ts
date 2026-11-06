export const formatCountdown = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const countdownProgress = (remaining: number, total: number) => (
  total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0
);
