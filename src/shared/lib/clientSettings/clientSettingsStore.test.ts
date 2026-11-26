import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_STORAGE_KEY, DEFAULT_SYNCED_APPEARANCE } from '@/shared/lib/appearance/settings';
import {
  LIST_DEBOUNCE_MS, PENDING_KEY, RECENT_EMOJI_KEY, SYNCED_KEY, applyRemoteClientSettings, flushClientSettings, getClientSettings,
  resetClientSettingsForTests, startClientSettingsSync, updateClientSettings, type ClientSettingsSnapshot, type ClientSettingsTransport,
} from './clientSettingsStore';

const snapshot = (patch: Partial<ClientSettingsSnapshot> = {}): ClientSettingsSnapshot => ({
  appearance: null, recentEmoji: [], recentReactions: [], version: 0, ...patch,
});

const transport = (initial: ClientSettingsSnapshot) => {
  let current = initial;
  const save = vi.fn(async (patch: Parameters<ClientSettingsTransport['save']>[0]) => {
    current = {
      appearance: patch.appearance ?? current.appearance,
      recentEmoji: patch.recentEmoji ?? current.recentEmoji,
      recentReactions: patch.recentReactions ?? current.recentReactions,
      version: current.version + 1,
    };
    return current;
  });
  return { load: vi.fn(async () => current), save };
};

beforeEach(() => {
  localStorage.clear();
  resetClientSettingsForTests();
});

afterEach(() => {
  resetClientSettingsForTests();
  vi.useRealTimers();
});

describe('client settings sync', () => {
  it('uploads the local settings once when the server has none yet', async () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ accent: 'pink', fontSize: 18 }));
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(['😀']));
    resetClientSettingsForTests();
    const api = transport(snapshot());
    await startClientSettingsSync('1', api);
    expect(api.save).toHaveBeenCalledWith({
      appearance: { ...DEFAULT_SYNCED_APPEARANCE, accent: 'pink', fontSize: 18 }, recentEmoji: ['😀'], recentReactions: [],
    });
    expect(getClientSettings()).toMatchObject({ ready: true, version: 1, appearance: { accent: 'pink' } });
    expect(JSON.parse(localStorage.getItem(SYNCED_KEY) ?? '[]')).toEqual(['1']);
  });

  it('lets the server win on the first start when it already has settings', async () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ accent: 'pink' }));
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(['😀']));
    resetClientSettingsForTests();
    const api = transport(snapshot({ appearance: { ...DEFAULT_SYNCED_APPEARANCE, accent: 'teal' }, recentEmoji: ['🔥'], version: 4 }));
    await startClientSettingsSync('1', api);
    expect(api.save).not.toHaveBeenCalled();
    expect(getClientSettings()).toMatchObject({ appearance: { accent: 'teal' }, recentEmoji: ['🔥'], version: 4 });
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '{}').accent).toBe('teal');
  });

  it('debounces list changes into one request', async () => {
    const api = transport(snapshot({ appearance: DEFAULT_SYNCED_APPEARANCE, version: 1 }));
    await startClientSettingsSync('1', api);
    vi.useFakeTimers();
    updateClientSettings({ recentEmoji: ['a'] }, LIST_DEBOUNCE_MS);
    updateClientSettings({ recentEmoji: ['b', 'a'] }, LIST_DEBOUNCE_MS);
    expect(getClientSettings().recentEmoji).toEqual(['b', 'a']);
    await vi.advanceTimersByTimeAsync(LIST_DEBOUNCE_MS - 100);
    expect(api.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save).toHaveBeenCalledWith({ recentEmoji: ['b', 'a'] });
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('keeps offline changes and sends them later', async () => {
    const api = transport(snapshot({ appearance: DEFAULT_SYNCED_APPEARANCE, version: 1 }));
    await startClientSettingsSync('1', api);
    api.save.mockRejectedValueOnce(new Error('offline'));
    updateClientSettings({ appearance: { ...DEFAULT_SYNCED_APPEARANCE, corners: 'round' } }, 0);
    await flushClientSettings();
    expect(JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}').appearance.corners).toBe('round');
    await flushClientSettings();
    expect(api.save).toHaveBeenLastCalledWith({ appearance: { ...DEFAULT_SYNCED_APPEARANCE, corners: 'round' } });
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('applies newer live updates and keeps unsent local changes on top', async () => {
    const api = transport(snapshot({ appearance: DEFAULT_SYNCED_APPEARANCE, version: 3 }));
    await startClientSettingsSync('1', api);
    applyRemoteClientSettings(snapshot({ appearance: { ...DEFAULT_SYNCED_APPEARANCE, accent: 'green' }, version: 2 }));
    expect(getClientSettings().appearance.accent).toBe('blue');
    vi.useFakeTimers();
    updateClientSettings({ recentReactions: ['👍'] }, LIST_DEBOUNCE_MS);
    applyRemoteClientSettings(snapshot({ appearance: { ...DEFAULT_SYNCED_APPEARANCE, accent: 'green' }, recentReactions: ['🔥'], version: 5 }));
    expect(getClientSettings()).toMatchObject({ appearance: { accent: 'green' }, recentReactions: ['👍'], version: 5 });
  });
});
