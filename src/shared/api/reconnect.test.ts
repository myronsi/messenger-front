import { describe, expect, it } from 'vitest';
import { reconnectDelay, shouldReconnect } from './reconnect';

describe('reconnectDelay', () => {
  it('doubles per attempt and stays within half to full of the ceiling', () => {
    expect(reconnectDelay(1, () => 0)).toBe(500);
    expect(reconnectDelay(1, () => 1)).toBe(1000);
    expect(reconnectDelay(3, () => 1)).toBe(4000);
  });

  it('is capped at 30 seconds', () => {
    expect(reconnectDelay(50, () => 1)).toBe(30_000);
  });
});

describe('shouldReconnect', () => {
  it('retries server and network closes but not policy violations', () => {
    expect(shouldReconnect(1000)).toBe(true);
    expect(shouldReconnect(1006)).toBe(true);
    expect(shouldReconnect(1012)).toBe(true);
    expect(shouldReconnect(1008)).toBe(false);
  });
});
