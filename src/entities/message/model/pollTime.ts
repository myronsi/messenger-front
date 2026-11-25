import { useEffect, useState } from 'react';
import type { MessagePoll } from './types';

const unit = (value: number, name: 'day' | 'hour' | 'minute', locale?: string) =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(value);

export const pollCountdown = (remainingMs: number, locale?: string) => {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(total / 86400), hours = Math.floor((total % 86400) / 3600), minutes = Math.floor((total % 3600) / 60);
  if (days) return `${unit(days, 'day', locale)} ${unit(hours, 'hour', locale)}`;
  if (hours) return `${unit(hours, 'hour', locale)} ${unit(minutes, 'minute', locale)}`;
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
};

const HOUR_MS = 3_600_000;

export const usePollNow = (poll: Pick<MessagePoll, 'close_at' | 'closed_at'>) => {
  const [now, setNow] = useState(() => Date.now());
  const closeAt = poll.close_at && !poll.closed_at ? Date.parse(poll.close_at) : NaN;
  useEffect(() => {
    if (!Number.isFinite(closeAt) || closeAt <= now) return undefined;
    const remaining = closeAt - now;
    const step = remaining <= HOUR_MS ? 1000 : Math.min(60_000, remaining - HOUR_MS + 1000);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(step, remaining));
    return () => window.clearTimeout(timer);
  }, [closeAt, now]);
  return now;
};
