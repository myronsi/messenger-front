import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callsEnabledOnServer, loadCallConfig, stopCallConfigLoading } from './availability';
import { configStore } from './stores';

const api = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock('../api/callsApi', () => ({ callsApi: api }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const enabled = { enabled: true, max_participants: 10, ring_timeout_seconds: 30 };

describe('call config loading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configStore.set(null);
    api.config.mockReset();
  });
  afterEach(() => {
    stopCallConfigLoading();
    vi.useRealTimers();
  });

  it('treats a failed load as unknown and retries with backoff until it succeeds', async () => {
    api.config.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('502')).mockResolvedValue(enabled);
    await loadCallConfig();
    expect(configStore.get()).toBeNull();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(api.config).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.config).toHaveBeenCalledTimes(2);
    expect(configStore.get()).toBeNull();
    await vi.advanceTimersByTimeAsync(3_999);
    expect(api.config).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.config).toHaveBeenCalledTimes(3);
    expect(callsEnabledOnServer()).toBe(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(api.config).toHaveBeenCalledTimes(3);
  });

  it('keeps the last known config when a reload fails and lets a manual reload win over the retry', async () => {
    api.config.mockResolvedValueOnce(enabled).mockRejectedValueOnce(new Error('502')).mockResolvedValue({ ...enabled, enabled: false });
    await loadCallConfig();
    await loadCallConfig();
    expect(callsEnabledOnServer()).toBe(true);
    await loadCallConfig();
    expect(configStore.get()?.enabled).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.config).toHaveBeenCalledTimes(3);
  });

  it('stops retrying and ignores late answers once call sync stops', async () => {
    let answer: (value: typeof enabled) => void = () => undefined;
    api.config.mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    await loadCallConfig();
    stopCallConfigLoading();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.config).toHaveBeenCalledTimes(1);
    const pending = loadCallConfig();
    stopCallConfigLoading();
    answer(enabled);
    await pending;
    expect(configStore.get()).toBeNull();
  });
});
