import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient, parseRealtimeEvent } from './realtime';

class Socket {
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = WebSocket.CLOSED; });
  open() { this.readyState = WebSocket.OPEN; this.onopen?.(); }
  drop(code = 1006) { this.readyState = WebSocket.CLOSED; this.onclose?.({ code }); }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }); }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('one user realtime connection', () => {
  let client: RealtimeClient;
  let sockets: Socket[];
  let ticket: ReturnType<typeof vi.fn<() => Promise<string>>>;
  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    ticket = vi.fn(async () => 'ws://test?ticket=single-use');
    client = new RealtimeClient(ticket, () => {
      const socket = new Socket(); sockets.push(socket); return socket as unknown as WebSocket;
    });
  });
  afterEach(() => { client.stop(); vi.useRealTimers(); });

  it('shares one ticket and socket between chat list and conversation subscriptions', async () => {
    const list = vi.fn(); const chat = vi.fn();
    const releaseList = client.subscribe({ onEvent: list });
    const releaseChat = client.subscribe({ onEvent: chat });
    await flush(); sockets[0].open();
    const event = { type: 'delete', event_id: '9', chat_id: '4', data: { message_id: '8' } };
    sockets[0].frame(event);
    expect(ticket).toHaveBeenCalledOnce(); expect(sockets).toHaveLength(1);
    expect(list).toHaveBeenCalledWith(event); expect(chat).toHaveBeenCalledWith(event);
    releaseChat(); expect(sockets[0].close).not.toHaveBeenCalled();
    releaseList(); expect(sockets[0].close).toHaveBeenCalledOnce();
  });

  it('delivers typing frames and sends typing only while connected', async () => {
    const events = vi.fn(); client.subscribe({ onEvent: events });
    const typing = { type: 'typing' as const, chat_id: '4', data: { is_typing: true, action: 'typing' as const } };
    await flush();
    expect(client.sendIfOpen(typing)).toBe(false);
    sockets[0].open();
    expect(client.sendIfOpen(typing)).toBe(true);
    expect(JSON.parse(sockets[0].send.mock.calls[0][0])).toEqual(typing);
    const frame = { type: 'typing', event_id: '9', chat_id: '4', data: { user_id: '7', is_typing: true, action: 'recording_voice' } };
    sockets[0].frame(frame);
    expect(events).toHaveBeenCalledWith(frame);
  });

  it('uses a fresh ticket on reconnect and tells all subscribers to catch up', async () => {
    const opened = vi.fn(); client.subscribe({ onOpen: opened });
    await flush(); sockets[0].open(); sockets[0].drop(1012);
    expect(client.getStatus()).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000); sockets[1].open();
    expect(ticket).toHaveBeenCalledTimes(2); expect(opened).toHaveBeenCalledTimes(2);
    expect(client.getStatus()).toBe('connected');
  });

  it('remembers that a connection was open until the session stops', async () => {
    client.subscribe({}); await flush();
    expect(client.hasOpened()).toBe(false);
    sockets[0].drop(1006);
    expect(client.getStatus()).toBe('reconnecting'); expect(client.hasOpened()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); sockets[1].open();
    expect(client.hasOpened()).toBe(true);
    client.stop();
    expect(client.hasOpened()).toBe(false);
  });

  it('ignores malformed and unknown events without interrupting future events', async () => {
    const event = vi.fn(); client.subscribe({ onEvent: event });
    await flush(); sockets[0].open();
    sockets[0].onmessage?.({ data: '{oops' });
    sockets[0].frame({ type: 'future-event', data: {} });
    sockets[0].frame({ type: 'message', data: { message: {} } });
    sockets[0].frame({ type: 'read', chat_id: '4', data: { user_id: '3', message_id: '2' } });
    expect(event).toHaveBeenCalledOnce();
  });

  it('stops automatically retrying terminal close codes', async () => {
    client.subscribe({}); await flush(); sockets[0].drop(4429);
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event('online')); await flush();
    expect(sockets).toHaveLength(1); expect(client.getStatus()).toBe('rejected');
  });

  it('cancels an in-flight ticket when the last subscriber leaves', async () => {
    let resolve!: (url: string) => void;
    ticket.mockReturnValue(new Promise(done => { resolve = done; }));
    const release = client.subscribe({}); release(); resolve('ws://stale'); await flush();
    expect(sockets).toHaveLength(0); expect(client.getStatus()).toBe('disconnected');
  });

  it('shows a delivery failure only for messages whose acknowledgement never arrives', async () => {
    const timeout = vi.fn(); const release = client.subscribe({ onDeliveryTimeout: timeout });
    const sender = client.sender(value => value, release);
    await flush(); sockets[0].open();
    sender.send(JSON.stringify({ type: 'message', chat_id: '4', client_temp_id: '-1', data: { content: 'ok' } }));
    sender.send(JSON.stringify({ type: 'message', chat_id: '4', client_temp_id: '-2', data: { content: 'ok' } }));
    sockets[0].frame({ type: 'ack', event_id: '8', chat_id: '4', client_temp_id: '-2', data: { message_id: '9' } });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(timeout).toHaveBeenCalledExactlyOnceWith('-1', '4');
  });

  it('allows system messages with no sender and rejects malformed message payloads', () => {
    expect(parseRealtimeEvent({ type: 'message', chat_id: '1', data: { message: { id: '9', sender: null, reactions: [] } } })).not.toBeNull();
    expect(parseRealtimeEvent({ type: 'message', chat_id: '1', data: { message: { id: '9' } } })).toBeNull();
  });

  it('accepts informational security alerts next to the password-reset notice', () => {
    expect(parseRealtimeEvent({ type: 'security_alert', event_id: '2', chat_id: null, data: { type: 'login', user_agent: 'Firefox' } })).not.toBeNull();
    expect(parseRealtimeEvent({ type: 'security_notice', event_id: '3', chat_id: null, data: { type: 'password_reset' } })).not.toBeNull();
  });
});
