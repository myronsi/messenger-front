import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRealtimeClient, RealtimeError, type ClientEvent } from './realtime';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor(readonly url: string) { FakeSocket.instances.push(this); }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = WebSocket.CLOSED; }
  open() { this.readyState = WebSocket.OPEN; this.onopen?.(); }
  receive(event: object) { this.onmessage?.({ data: JSON.stringify(event) }); }
  drop(code = 1006) { this.readyState = WebSocket.CLOSED; this.onclose?.({ code }); }
}

const text = (id: string): ClientEvent => ({
  type: 'message', client_temp_id: id, chat_id: '10', data: { type: 'text', content: 'hi' },
});

const setup = () => {
  const client = createRealtimeClient({
    getUrl: async () => 'ws://test/api/v2/ws?ticket=t',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    ackTimeoutMs: 1000,
  });
  const status = vi.fn();
  client.onStatus(status);
  return { client, status, socket: () => FakeSocket.instances[FakeSocket.instances.length - 1] };
};

beforeEach(() => { FakeSocket.instances = []; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('realtime client', () => {
  it('queues events until the socket is open, then sends them in order', async () => {
    const { client, socket } = setup();
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    client.send(text('a'));
    client.send(text('b'));
    expect(socket().sent).toEqual([]);
    socket().open();
    expect(socket().sent.map((raw) => JSON.parse(raw).client_temp_id)).toEqual(['a', 'b']);
  });

  it('resolves a request with its ack and rejects it with its error', async () => {
    const { client, socket } = setup();
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    socket().open();
    const ok = client.request(text('a') as never);
    const bad = client.request(text('b') as never);
    socket().receive({ type: 'ack', event_id: '1', chat_id: '10', client_temp_id: 'a', data: { message_id: '99', created_at: 't' } });
    socket().receive({ type: 'error', event_id: '2', chat_id: '10', client_temp_id: 'b', data: { code: 'forbidden', message: 'no' } });
    await expect(ok).resolves.toEqual({ message_id: '99', created_at: 't' });
    await expect(bad).rejects.toEqual(new RealtimeError('forbidden', 'no'));
  });

  it('times out a request that is never answered', async () => {
    const { client, socket } = setup();
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    socket().open();
    const request = client.request(text('a') as never);
    vi.advanceTimersByTime(1000);
    await expect(request).rejects.toMatchObject({ code: 'timeout' });
  });

  it('delivers server events to subscribers', async () => {
    const { client, socket } = setup();
    const listener = vi.fn();
    client.subscribe(listener);
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    socket().open();
    socket().receive({ type: 'typing', event_id: '3', chat_id: '10', data: { user_id: '2', is_typing: true } });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'typing', chat_id: '10' }));
  });

  it('reconnects after a drop and reports the reconnect, but not after the server refused the session', async () => {
    const { client, status, socket } = setup();
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    socket().open();
    expect(status).toHaveBeenLastCalledWith('open', { reconnected: false, failed: false });
    socket().drop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeSocket.instances).toHaveLength(2);
    socket().open();
    expect(status).toHaveBeenLastCalledWith('open', { reconnected: true, failed: false });
    socket().drop(1008);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('stop() closes the socket and fails what is pending', async () => {
    const { client, socket } = setup();
    client.start();
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    socket().open();
    const request = client.request(text('a') as never);
    client.stop();
    await expect(request).rejects.toMatchObject({ code: 'disconnected' });
    expect(socket().readyState).toBe(WebSocket.CLOSED);
  });
});
