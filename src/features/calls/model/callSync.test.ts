import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeListener } from '@/shared/api/realtime';
import { startCallSync } from './callSync';
import { configStore, idleSession, patchSession, sessionStore } from './stores';

const socket = vi.hoisted(() => ({ listeners: [] as RealtimeListener[] }));
const controller = vi.hoisted(() => ({
  catchUpCallKeys: vi.fn(), deliverCallKeys: vi.fn(), followCalls: vi.fn(), hangUpLocally: vi.fn(async () => undefined), ownsCallMedia: () => false,
}));
const config = vi.hoisted(() => ({
  enabled: false,
  loadCallConfig: vi.fn(async () => undefined),
  stopCallConfigLoading: vi.fn(),
  callConfigReady: vi.fn(async () => undefined),
  callsEnabledOnServer: () => config.enabled,
}));
const api = vi.hoisted(() => ({ list: vi.fn(async () => []), get: vi.fn() }));
const tabs = vi.hoisted(() => ({
  elsewhere: false,
  released: [] as (() => void)[],
  aborted: vi.fn(),
}));

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribe: (listener: RealtimeListener) => { socket.listeners.push(listener); return () => undefined; } },
}));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'token', subscribeToAccessToken: () => () => undefined }));
vi.mock('../api/callsApi', () => ({ callsApi: api }));
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
    config.enabled = false;
    vi.clearAllMocks();
    sessionStore.set(idleSession);
    configStore.set(null);
  });

  it('does not list calls when calls are disabled on the server', async () => {
    stop = startCallSync();
    socket.listeners[0].onOpen?.({ reconnected: false });
    await settle();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('lists calls on open when enabled, and once calls become enabled later', async () => {
    config.enabled = true;
    stop = startCallSync();
    socket.listeners[0].onOpen?.({ reconnected: false });
    await settle();
    expect(api.list).toHaveBeenCalledTimes(1);
    stop(); stop = null;
    config.enabled = false;
    stop = startCallSync();
    config.enabled = true;
    configStore.set({ enabled: true } as never);
    await settle();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('catches up on call keys every time the realtime socket opens', () => {
    stop = startCallSync();
    expect(controller.catchUpCallKeys).not.toHaveBeenCalled();
    socket.listeners[0].onOpen?.({ reconnected: false });
    socket.listeners[0].onOpen?.({ reconnected: true });
    expect(controller.catchUpCallKeys).toHaveBeenCalledTimes(2);
  });

  it('loads the call config once on start and not again on the first socket open', () => {
    stop = startCallSync();
    socket.listeners[0].onOpen?.({ reconnected: false });
    expect(config.loadCallConfig).toHaveBeenCalledTimes(1);
  });

  it('reloads the call config on every reconnect and when the tab becomes visible', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    stop = startCallSync();
    expect(config.loadCallConfig).toHaveBeenCalledTimes(1);
    socket.listeners[0].onOpen?.({ reconnected: true });
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
