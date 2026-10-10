import type { ClientEvent, ServerEvent } from '@myronsi/messenger-api/ws-events';
import { handleHelloEvent } from '@/shared/api/serverHello';
import { onConnectivityRestored, reconnectDelay } from '@/shared/api/reconnect';
import { trackWebSocket } from '@/shared/api/socketRegistry';
import { newLocalId, type Id } from '@/shared/lib/ids';

// One WebSocket per signed-in user (v2 contract): every chat's events arrive on it, tagged with chat_id, and
// every client event goes out on it. Client events carry a client_temp_id and are answered with `ack` or
// `error`; request() turns that into a promise.

export type { ClientEvent, ServerEvent };
export type AckedClientEvent = Exclude<ClientEvent, { type: 'typing' }>;
export type AckData = Extract<ServerEvent, { type: 'ack' }>['data'];
export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed';

export class RealtimeError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message || code);
    this.name = 'RealtimeError';
  }
}

interface Pending {
  resolve: (data: AckData) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface RealtimeOptions {
  // A fresh ws(s):// URL with a one-time ticket for every connection attempt.
  getUrl: () => Promise<string>;
  createSocket?: (url: string) => WebSocket;
  ackTimeoutMs?: number;
  maxQueued?: number;
}

// After this many failed attempts in a row the status listeners hear `closed` with failed = true, while
// reconnecting goes on in the background.
export const RECONNECT_ATTEMPTS_BEFORE_ERROR = 5;

export const createRealtimeClient = ({
  getUrl,
  createSocket = (url) => trackWebSocket(new WebSocket(url)),
  ackTimeoutMs = 20_000,
  maxQueued = 200,
}: RealtimeOptions) => {
  const listeners = new Set<(event: ServerEvent) => void>();
  const statusListeners = new Set<(status: RealtimeStatus, info: { reconnected: boolean; failed: boolean }) => void>();
  const pending = new Map<string, Pending>();
  let queue: ClientEvent[] = [];
  let socket: WebSocket | null = null;
  let started = false;
  let rejected = false;
  let attempts = 0;
  let wasOpen = false;
  let connecting = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopWatching: (() => void) | null = null;
  let status: RealtimeStatus = 'idle';

  const setStatus = (next: RealtimeStatus, info = { reconnected: false, failed: false }) => {
    status = next;
    statusListeners.forEach((listener) => listener(next, info));
  };

  const settle = (clientTempId: string | undefined, outcome: { data?: AckData; error?: Error }) => {
    if (!clientTempId) return;
    const entry = pending.get(clientTempId);
    if (!entry) return;
    pending.delete(clientTempId);
    clearTimeout(entry.timer);
    if (outcome.error) entry.reject(outcome.error);
    else entry.resolve(outcome.data as AckData);
  };

  const flush = () => {
    while (socket?.readyState === WebSocket.OPEN && queue.length > 0) {
      const event = queue.shift() as ClientEvent;
      try {
        socket.send(JSON.stringify(event));
      } catch {
        queue.unshift(event);
        break;
      }
    }
  };

  const scheduleReconnect = () => {
    if (!started || rejected) return;
    attempts += 1;
    if (attempts === RECONNECT_ATTEMPTS_BEFORE_ERROR) setStatus('closed', { reconnected: false, failed: true });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void connect(); }, reconnectDelay(attempts));
  };

  const handleMessage = (raw: string) => {
    let event: unknown;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof event !== 'object' || event === null || typeof (event as { type?: unknown }).type !== 'string') return;
    // hello reports the server's contract versions; listeners get it too (it carries the user id).
    handleHelloEvent(event);
    const serverEvent = event as ServerEvent;
    if (serverEvent.type === 'ack') settle(serverEvent.client_temp_id, { data: serverEvent.data });
    if (serverEvent.type === 'error' && serverEvent.client_temp_id) {
      settle(serverEvent.client_temp_id, { error: new RealtimeError(serverEvent.data.code, serverEvent.data.message) });
    }
    listeners.forEach((listener) => {
      try {
        listener(serverEvent);
      } catch (error) {
        console.error('Realtime listener failed:', error);
      }
    });
  };

  const connect = async () => {
    if (!started || rejected || connecting) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    connecting = true;
    setStatus('connecting');
    let next: WebSocket;
    try {
      next = createSocket(await getUrl());
    } catch {
      connecting = false;
      scheduleReconnect();
      return;
    }
    connecting = false;
    if (!started) {
      try { next.close(1000, 'Stopped'); } catch { /* already closed */ }
      return;
    }
    socket = next;
    next.onopen = () => {
      if (socket !== next) return;
      const reconnected = wasOpen || attempts > 0;
      attempts = 0;
      wasOpen = true;
      flush();
      setStatus('open', { reconnected, failed: false });
    };
    next.onmessage = (message) => { if (socket === next) handleMessage(String(message.data)); };
    next.onclose = (close) => {
      if (socket !== next) return;
      socket = null;
      setStatus('closed');
      // 1008: the server refused the session; only start() (a new sign-in) tries again.
      if (close.code === 1008) {
        rejected = true;
        return;
      }
      scheduleReconnect();
    };
  };

  const reconnectNow = () => {
    if (!started || rejected || connecting || (socket && socket.readyState !== WebSocket.CLOSED)) return;
    if (timer) clearTimeout(timer);
    timer = null;
    void connect();
  };

  return {
    start() {
      if (started) return;
      started = true;
      rejected = false;
      attempts = 0;
      wasOpen = false;
      stopWatching = onConnectivityRestored(reconnectNow);
      void connect();
    },

    // Closes the socket and forgets everything queued: the next sign-in starts clean.
    stop() {
      started = false;
      stopWatching?.();
      stopWatching = null;
      if (timer) clearTimeout(timer);
      timer = null;
      const current = socket;
      socket = null;
      if (current) {
        try { current.close(1000, 'Signed out'); } catch { /* already closed */ }
      }
      queue = [];
      pending.forEach((entry) => { clearTimeout(entry.timer); entry.reject(new RealtimeError('disconnected')); });
      pending.clear();
      setStatus('idle');
    },

    // Sends now, or as soon as the socket is open again.
    send(event: ClientEvent) {
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify(event));
          return;
        } catch {
          // queued below
        }
      }
      if (event.type === 'typing') return; // stale by the time it could go out
      queue.push(event);
      if (queue.length > maxQueued) queue = queue.slice(-maxQueued);
    },

    // Sends an event and resolves with its ack (rejects on error or timeout).
    request(event: AckedClientEvent): Promise<AckData> {
      return new Promise<AckData>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(event.client_temp_id);
          reject(new RealtimeError('timeout'));
        }, ackTimeoutMs);
        pending.set(event.client_temp_id, { resolve, reject, timer: timeout });
        this.send(event);
      });
    },

    subscribe(listener: (event: ServerEvent) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    onStatus(listener: (status: RealtimeStatus, info: { reconnected: boolean; failed: boolean }) => void) {
      statusListeners.add(listener);
      return () => { statusListeners.delete(listener); };
    },

    get status() {
      return status;
    },
  };
};

export type RealtimeClient = ReturnType<typeof createRealtimeClient>;

// newClientTempId is the client_temp_id of an event; for a message it is also the message's local id.
export const newClientTempId = (): Id => newLocalId();

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// A client event of one chat, before the handle adds chat_id (and client_temp_id).
export type ChatClientEvent = DistributiveOmit<ClientEvent, 'chat_id' | 'client_temp_id'>;

// ChatRealtime is what a chat screen and its components use to talk to the server: the shared socket, bound
// to one chat.
export interface ChatRealtime {
  chatId: Id;
  // Sends without waiting; with clientTempId the event carries that id (an optimistic message's local id).
  send: (event: ChatClientEvent, clientTempId?: string) => void;
  // Sends and waits for the ack.
  request: (event: Exclude<ChatClientEvent, { type: 'typing' }>, clientTempId?: string) => Promise<AckData>;
}

export const bindChat = (client: RealtimeClient, chatId: Id): ChatRealtime => ({
  chatId,
  send: (event, clientTempId) => {
    const full = event.type === 'typing'
      ? { ...event, chat_id: chatId }
      : { ...event, chat_id: chatId, client_temp_id: clientTempId ?? newClientTempId() };
    client.send(full as ClientEvent);
  },
  request: (event, clientTempId) => client.request({
    ...event, chat_id: chatId, client_temp_id: clientTempId ?? newClientTempId(),
  } as AckedClientEvent),
});
