import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatTransport } from './types';
import { RECONNECT_ATTEMPTS_BEFORE_ERROR, useChatSocket } from './useChatSocket';
import type { Id } from '@/shared/lib/ids';

vi.mock('@/shared/api/webSocketUrl', () => ({
  getChatWebSocketUrl: vi.fn(async (chatId: Id) => `ws://test/ws/chat/${chatId}?ticket=t`),
}));

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor(public url: string) { FakeWebSocket.instances.push(this); }
  addEventListener() { /* used by the socket registry only */ }
  send() { /* not needed */ }
  close() { this.readyState = FakeWebSocket.CLOSED; }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
  drop(code = 1006) { this.readyState = FakeWebSocket.CLOSED; this.onclose?.({ code }); }
}

const wsRef = { current: null as WebSocket | null };
const messageQueueRef = { current: [] };
const pendingMessageIdsRef = { current: [] };
const transport = (connectionRetryKey = 0): ChatTransport => ({
  wsRef,
  messageQueueRef,
  pendingMessageIdsRef,
  connectionRetryKey,
  requestReconnect: () => undefined,
});

const latestSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    wsRef.current = null;
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const setup = (token = 'a') => {
    const onReconnected = vi.fn();
    const onConnectionFailed = vi.fn();
    const hook = renderHook(({ token: current, retryKey }) => useChatSocket({
      chatId: '7', token: current, transport: transport(retryKey), onEvent: () => undefined, onConnectionFailed, onReconnected,
    }), { initialProps: { token, retryKey: 0 } });
    return { ...hook, onReconnected, onConnectionFailed };
  };

  it('keeps the socket when the access token is refreshed', async () => {
    const { rerender } = setup();
    await flush();
    act(() => latestSocket().open());
    rerender({ token: 'b', retryKey: 0 });
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(latestSocket().readyState).toBe(FakeWebSocket.OPEN);
  });

  it('catches up after a reconnect but not on the first open', async () => {
    const { onReconnected } = setup();
    await flush();
    act(() => latestSocket().open());
    expect(onReconnected).not.toHaveBeenCalled();

    act(() => latestSocket().drop());
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    act(() => latestSocket().open());
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(onReconnected).toHaveBeenCalledTimes(1);
  });

  it('catches up when the first open only succeeds after failed attempts', async () => {
    const { onReconnected } = setup();
    await flush();
    act(() => latestSocket().drop());
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    act(() => latestSocket().open());
    expect(onReconnected).toHaveBeenCalledTimes(1);
  });

  it('keeps a rejected socket closed when a send asks for a reconnect', async () => {
    const { rerender } = setup();
    await flush();
    act(() => latestSocket().drop(1008));
    rerender({ token: 'a', retryKey: 1 });
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('keeps retrying after reporting the outage once', async () => {
    const { onConnectionFailed } = setup();
    await flush();
    for (let attempt = 0; attempt < RECONNECT_ATTEMPTS_BEFORE_ERROR + 3; attempt += 1) {
      act(() => latestSocket().drop());
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    }
    expect(onConnectionFailed).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(RECONNECT_ATTEMPTS_BEFORE_ERROR + 4);
  });

  it('reconnects right away when the browser comes back online', async () => {
    setup();
    await flush();
    act(() => latestSocket().drop());
    act(() => { window.dispatchEvent(new Event('online')); });
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not reconnect when the server rejects the socket', async () => {
    setup();
    await flush();
    act(() => latestSocket().drop(1008));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    act(() => { window.dispatchEvent(new Event('online')); });
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
