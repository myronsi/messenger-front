import { describe, expect, it } from 'vitest';
import { closeForGood, reconnectDelay, shouldReconnect } from './reconnect';

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

const fakeSocket = () => ({ close: () => undefined }) as unknown as WebSocket;

describe('shouldReconnect', () => {
  it('retries server and network closes but not policy violations', () => {
    const socket = fakeSocket();
    expect(shouldReconnect(socket, 1000)).toBe(true);
    expect(shouldReconnect(socket, 1006)).toBe(true);
    expect(shouldReconnect(socket, 1012)).toBe(true);
    expect(shouldReconnect(socket, 1008)).toBe(false);
  });

  it('does not reopen a socket closed for good by the client', () => {
    const socket = fakeSocket();
    closeForGood(socket, 'Chat deleted');
    expect(shouldReconnect(socket, 1000)).toBe(false);
  });
});
