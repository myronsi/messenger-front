import type { ServerEvent } from '@myronsi/messenger-api';
import { getChatWebSocketUrl } from './webSocketUrl';
import { onConnectivityRestored, reconnectDelay } from './reconnect';
import { handleHelloEvent } from './serverHello';
import { onCloseAllWebSockets, trackWebSocket } from './socketRegistry';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'rejected';
export interface RealtimeListener {
  onOpen?: () => void;
  onEvent?: (event: ServerEvent) => void;
  onStatus?: (status: ConnectionStatus, attempts: number) => void;
  onDeliveryTimeout?: (tempId: string, chatId: string) => void;
}
export type SocketSender = Pick<WebSocket, 'readyState' | 'send' | 'close'>;

const eventTypes = new Set(['ack', 'approval_request_created', 'call_keys', 'call_updated', 'chat_created', 'chat_deleted', 'chat_list_update',
  'delete', 'edit', 'error', 'group_created', 'group_updated', 'hello', 'message', 'presence',
  'reaction_add', 'reaction_remove', 'read', 'security_notice', 'security_alert', 'recovery_request']);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export const parseRealtimeEvent = (raw: unknown): ServerEvent | null => {
  if (!record(raw) || typeof raw.type !== 'string' || !eventTypes.has(raw.type) || !record(raw.data)) return null;
  if (raw.chat_id != null && typeof raw.chat_id !== 'string') return null;
  if (raw.type === 'message' || raw.type === 'edit') {
    const message = raw.data.message;
    if (!record(message) || typeof message.id !== 'string' || !Array.isArray(message.reactions)) return null;
  }
  return raw as unknown as ServerEvent;
};

// One physical connection per tab. Views subscribe to events; opening/closing a
// conversation never creates or tears down the user's connection to other chats.
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<RealtimeListener>();
  private statusListeners = new Set<() => void>();
  private status: ConnectionStatus = 'disconnected';
  private attempts = 0;
  private opened = false;
  private generation = 0;
  private connecting = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private stopConnectivity: (() => void) | undefined;
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private getUrl = () => getChatWebSocketUrl(0),
    private createSocket = (url: string) => trackWebSocket(new WebSocket(url)),
  ) {}

  getStatus = () => this.status;
  hasOpened = () => this.opened;
  subscribeStatus = (listener: () => void) => {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  };

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener());
    this.listeners.forEach(listener => listener.onStatus?.(status, this.attempts));
  }

  subscribe(listener: RealtimeListener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.stopConnectivity = onConnectivityRestored(() => this.reconnectNow());
      void this.connect();
    } else if (this.status === 'connected') {
      queueMicrotask(() => { if (this.listeners.has(listener)) listener.onOpen?.(); });
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stop();
    };
  }

  sender(send: (payload: string) => string, release: () => void): SocketSender {
    const readyState = () => this.socket?.readyState ?? WebSocket.CLOSED;
    return {
      get readyState() { return readyState(); },
      send: payload => {
        if (typeof payload !== 'string' || this.socket?.readyState !== WebSocket.OPEN) throw new Error('Realtime is disconnected');
        const wire = send(payload);
        this.socket.send(wire);
        const envelope = JSON.parse(wire);
        if (envelope.type === 'message' && typeof envelope.client_temp_id === 'string') {
          const id = envelope.client_temp_id;
          clearTimeout(this.pending.get(id));
          this.pending.set(id, setTimeout(() => {
            this.pending.delete(id);
            this.listeners.forEach(listener => listener.onDeliveryTimeout?.(id, envelope.chat_id));
          }, 20_000));
        }
      },
      close: release,
    };
  }

  reconnectNow() {
    if (this.status === 'rejected' || this.socket || this.connecting || !this.listeners.size) return;
    clearTimeout(this.retryTimer);
    void this.connect();
  }

  private retry() {
    if (!this.listeners.size) return;
    this.attempts += 1;
    this.setStatus('reconnecting');
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => { void this.connect(); }, reconnectDelay(this.attempts));
  }

  private async connect() {
    if (this.connecting || this.socket || !this.listeners.size || this.status === 'rejected') return;
    const generation = this.generation;
    this.connecting = true;
    if (this.attempts === 0) this.setStatus('connecting');
    try {
      const url = await this.getUrl();
      if (generation !== this.generation || !this.listeners.size) return;
      const socket = this.createSocket(url);
      this.socket = socket;
      socket.onopen = () => {
        if (socket !== this.socket) return;
        this.attempts = 0;
        this.opened = true;
        this.setStatus('connected');
        this.listeners.forEach(listener => listener.onOpen?.());
      };
      socket.onmessage = event => {
        if (socket !== this.socket) return;
        let frame: ServerEvent | null;
        try { frame = parseRealtimeEvent(JSON.parse(event.data)); } catch { return; }
        if (!frame || handleHelloEvent(frame)) return;
        const tempId = frame.type === 'message' ? frame.data.message.client_temp_id :
          'client_temp_id' in frame ? frame.client_temp_id : undefined;
        if (typeof tempId === 'string') { clearTimeout(this.pending.get(tempId)); this.pending.delete(tempId); }
        // An invalid frame or one consumer must not interrupt delivery to others.
        for (const listener of this.listeners) {
          try { listener.onEvent?.(frame); } catch (error) { console.error('Unable to apply realtime event', error); }
        }
      };
      socket.onerror = () => { /* close drives reconnect; no second retry timer */ };
      socket.onclose = event => {
        if (socket !== this.socket) return;
        this.socket = null;
        if ([1008, 4426, 4429].includes(event.code)) this.setStatus('rejected');
        else this.retry();
      };
    } catch {
      if (generation === this.generation) this.retry();
    } finally {
      if (generation === this.generation) this.connecting = false;
    }
  }

  stop() {
    this.generation += 1;
    this.connecting = false;
    clearTimeout(this.retryTimer);
    this.pending.forEach(timer => clearTimeout(timer));
    this.pending.clear();
    this.stopConnectivity?.();
    this.stopConnectivity = undefined;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, 'Session ended');
    this.attempts = 0;
    this.opened = false;
    this.setStatus('disconnected');
  }
}

export const realtime = new RealtimeClient();
onCloseAllWebSockets(() => realtime.stop());
