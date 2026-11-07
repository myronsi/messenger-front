import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeListener } from '@/shared/api/realtime';
import { startCallSync } from './callSync';
import { idleSession, patchSession, sessionStore } from './stores';

const socket = vi.hoisted(() => ({ listeners: [] as RealtimeListener[] }));
const controller = vi.hoisted(() => ({
  catchUpCallKeys: vi.fn(), deliverCallKeys: vi.fn(), followCalls: vi.fn(), hangUpLocally: vi.fn(async () => undefined), ownsCallMedia: () => false,
}));
const config = vi.hoisted(() => ({ loadCallConfig: vi.fn(async () => undefined), stopCallConfigLoading: vi.fn() }));
const tabs = vi.hoisted(() => ({
  elsewhere: false,
  released: [] as (() => void)[],
  aborted: vi.fn(),
}));

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribe: (listener: RealtimeListener) => { socket.listeners.push(listener); return () => undefined; } },
}));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'token', subscribeToAccessToken: () => () => undefined }));
vi.mock('../api/callsApi', () => ({ callsApi: { list: vi.fn(async () => []), get: vi.fn() } }));
vi.mock('./availability', () => config);
vi.mock('./tabOwnership', () => ({
  isMediaOwnedElsewhere: async () => tabs.elsewhere,
  onMediaOwnershipChange: () => () => undefined,
  waitForMediaRelease: (onReleased: () => void) => { tabs.released.push(onReleased); return tabs.aborted; },
}));
vi.mock('./callController', () => controller);

const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

describe('call sync', () => {
  let stop: (() => void) | null = null;
  afterEach(() => {
    stop?.(); stop = null; socket.listeners.length = 0;
    tabs.elsewhere = false; tabs.released.length = 0;
    vi.clearAllMocks();
    sessionStore.set(idleSession);
  });

  it('catches up on call keys every time the realtime socket opens', () => {
    stop = startCallSync();
    expect(controller.catchUpCallKeys).not.toHaveBeenCalled();
    socket.listeners[0].onOpen?.();
    socket.listeners[0].onOpen?.();
    expect(controller.catchUpCallKeys).toHaveBeenCalledTimes(2);
  });

  it('reloads the call config on every reconnect and when the tab becomes visible', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    stop = startCallSync();
    expect(config.loadCallConfig).toHaveBeenCalledTimes(1);
    socket.listeners[0].onOpen?.();
    expect(config.loadCallConfig).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(config.loadCallConfig).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(config.loadCallConfig).toHaveBeenCalledTimes(3);
    stop(); stop = null;
    expect(config.stopCallConfigLoading).toHaveBeenCalled();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(config.loadCallConfig).toHaveBeenCalledTimes(3);
    visibility.mockRestore();
  });

  it('clears the other-tab state once the owning tab releases the media lock silently', async () => {
    tabs.elsewhere = true;
    stop = startCallSync();
    await settle();
    expect(sessionStore.get().otherTab).toBe(true);
    expect(tabs.released).toHaveLength(1);
    tabs.elsewhere = false;
    tabs.released[0]();
    await settle();
    expect(sessionStore.get().otherTab).toBe(false);
    expect(tabs.released).toHaveLength(1);
  });

  it('starts waiting when a failed join marks the media as owned by another tab', async () => {
    stop = startCallSync();
    await settle();
    expect(tabs.released).toHaveLength(0);
    tabs.elsewhere = true;
    patchSession({ otherTab: true });
    await settle();
    expect(tabs.released).toHaveLength(1);
    stop(); stop = null;
    expect(tabs.aborted).toHaveBeenCalled();
  });
});
