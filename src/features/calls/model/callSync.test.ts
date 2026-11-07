import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeListener } from '@/shared/api/realtime';
import { startCallSync } from './callSync';

const socket = vi.hoisted(() => ({ listeners: [] as RealtimeListener[] }));
const controller = vi.hoisted(() => ({
  catchUpCallKeys: vi.fn(), deliverCallKeys: vi.fn(), followCalls: vi.fn(), hangUpLocally: vi.fn(async () => undefined), ownsCallMedia: () => false,
}));

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribe: (listener: RealtimeListener) => { socket.listeners.push(listener); return () => undefined; } },
}));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'token', subscribeToAccessToken: () => () => undefined }));
vi.mock('../api/callsApi', () => ({ callsApi: { list: vi.fn(async () => []), get: vi.fn() } }));
vi.mock('./availability', () => ({ loadCallConfig: async () => undefined }));
vi.mock('./tabOwnership', () => ({ isMediaOwnedElsewhere: async () => false, onMediaOwnershipChange: () => () => undefined }));
vi.mock('./callController', () => controller);

describe('call sync', () => {
  let stop: (() => void) | null = null;
  afterEach(() => { stop?.(); stop = null; socket.listeners.length = 0; });

  it('catches up on call keys every time the realtime socket opens', () => {
    stop = startCallSync();
    expect(controller.catchUpCallKeys).not.toHaveBeenCalled();
    socket.listeners[0].onOpen?.();
    socket.listeners[0].onOpen?.();
    expect(controller.catchUpCallKeys).toHaveBeenCalledTimes(2);
  });
});
