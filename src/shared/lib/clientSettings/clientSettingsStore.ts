import { onAccountCleared } from '@/shared/auth/accountStorage';
import {
  APPEARANCE_STORAGE_KEY, DEFAULT_SYNCED_APPEARANCE, loadAppearance, parseAppearancePatch, saveAppearance, syncedPart, type SyncedAppearance,
} from '@/shared/lib/appearance/settings';

export const RECENT_EMOJI_KEY = 'messenger.recentEmoji';
export const RECENT_REACTIONS_KEY = 'messenger.recentReactions';
export const PENDING_KEY = 'messenger:client-settings:pending';
export const SYNCED_KEY = 'messenger:client-settings:synced';
export const RECENT_EMOJI_MAX = 24;
export const RECENT_REACTIONS_MAX = 8;
export const LIST_DEBOUNCE_MS = 2000;
export const APPEARANCE_DEBOUNCE_MS = 600;
const RETRY_MS = 30_000;

export interface ClientSettingsSnapshot {
  appearance: SyncedAppearance | null;
  recentEmoji: string[];
  recentReactions: string[];
  version: number;
}

export interface ClientSettingsPatch {
  appearance?: SyncedAppearance;
  recentEmoji?: string[];
  recentReactions?: string[];
}

export interface ClientSettingsTransport {
  load: () => Promise<ClientSettingsSnapshot>;
  save: (patch: ClientSettingsPatch) => Promise<ClientSettingsSnapshot>;
}

export interface ClientSettingsState {
  appearance: SyncedAppearance;
  recentEmoji: string[];
  recentReactions: string[];
  version: number;
  ready: boolean;
}

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

export const cleanList = (value: unknown, max: number): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0 && !seen.has(item) && !!seen.add(item)).slice(0, max);
};

const readPending = (): ClientSettingsPatch => {
  const value = readJson(PENDING_KEY);
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const patch: ClientSettingsPatch = {};
  if (source.appearance) patch.appearance = syncedPart({ ...DEFAULT_SYNCED_APPEARANCE, ...parseAppearancePatch(source.appearance) });
  if (Array.isArray(source.recentEmoji)) patch.recentEmoji = cleanList(source.recentEmoji, RECENT_EMOJI_MAX);
  if (Array.isArray(source.recentReactions)) patch.recentReactions = cleanList(source.recentReactions, RECENT_REACTIONS_MAX);
  return patch;
};

const initialState = (): ClientSettingsState => ({
  appearance: loadAppearance(),
  recentEmoji: cleanList(readJson(RECENT_EMOJI_KEY), RECENT_EMOJI_MAX),
  recentReactions: cleanList(readJson(RECENT_REACTIONS_KEY), RECENT_REACTIONS_MAX),
  version: 0,
  ready: false,
});

let state: ClientSettingsState = initialState();
let pending: ClientSettingsPatch = readPending();
let transport: ClientSettingsTransport | null = null;
let session = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let due = 0;
let sending = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const persist = (next: ClientSettingsState) => {
  if (next.appearance !== state.appearance) saveAppearance(next.appearance);
  if (next.recentEmoji !== state.recentEmoji) writeJson(RECENT_EMOJI_KEY, next.recentEmoji);
  if (next.recentReactions !== state.recentReactions) writeJson(RECENT_REACTIONS_KEY, next.recentReactions);
};

const setState = (next: ClientSettingsState) => {
  if (next === state) return;
  persist(next);
  state = next;
  emit();
};

const withPatch = (base: ClientSettingsState, patch: ClientSettingsPatch): ClientSettingsState => ({
  ...base,
  ...(patch.appearance ? { appearance: patch.appearance } : {}),
  ...(patch.recentEmoji ? { recentEmoji: patch.recentEmoji } : {}),
  ...(patch.recentReactions ? { recentReactions: patch.recentReactions } : {}),
});

const fromSnapshot = (snapshot: ClientSettingsSnapshot): ClientSettingsState => withPatch({
  ...state,
  appearance: snapshot.appearance ?? DEFAULT_SYNCED_APPEARANCE,
  recentEmoji: cleanList(snapshot.recentEmoji, RECENT_EMOJI_MAX),
  recentReactions: cleanList(snapshot.recentReactions, RECENT_REACTIONS_MAX),
  version: snapshot.version,
  ready: true,
}, pending);

const savePending = () => writeJson(PENDING_KEY, Object.keys(pending).length ? pending : null);

const clearTimer = () => {
  if (timer) clearTimeout(timer);
  timer = undefined;
  due = 0;
};

const schedule = (delay: number) => {
  if (!transport || !Object.keys(pending).length) return;
  const at = Date.now() + delay;
  if (timer && due <= at) return;
  clearTimer();
  due = at;
  timer = setTimeout(() => { clearTimer(); void flushClientSettings(); }, delay);
};

export const flushClientSettings = async () => {
  if (!transport || sending || !Object.keys(pending).length) return;
  clearTimer();
  const current = session;
  const outgoing = pending;
  pending = {};
  sending = true;
  try {
    const snapshot = await transport.save(outgoing);
    if (current !== session) return;
    savePending();
    if (snapshot.version >= state.version) setState(fromSnapshot(snapshot));
  } catch {
    if (current !== session) return;
    pending = { ...outgoing, ...pending };
    savePending();
    schedule(RETRY_MS);
  } finally {
    sending = false;
    if (current === session && Object.keys(pending).length && !timer) schedule(0);
  }
};

export const updateClientSettings = (patch: ClientSettingsPatch, delay = APPEARANCE_DEBOUNCE_MS) => {
  pending = { ...pending, ...patch };
  savePending();
  setState(withPatch(state, patch));
  schedule(delay);
};

export const applyRemoteClientSettings = (snapshot: ClientSettingsSnapshot) => {
  if (snapshot.version <= state.version) return;
  setState(fromSnapshot(snapshot));
};

const onOnline = () => { void flushClientSettings(); };

const readSynced = (): string[] => cleanList(readJson(SYNCED_KEY), 50);

export const startClientSettingsSync = async (userId: string, next: ClientSettingsTransport) => {
  stopClientSettingsSync();
  transport = next;
  const current = ++session;
  window.addEventListener('online', onOnline);
  let snapshot: ClientSettingsSnapshot;
  try {
    snapshot = await next.load();
  } catch {
    return;
  }
  if (current !== session) return;
  const synced = readSynced();
  const firstTime = !synced.includes(userId);
  if (firstTime && snapshot.appearance === null) {
    pending = { appearance: state.appearance, recentEmoji: state.recentEmoji, recentReactions: state.recentReactions, ...pending };
  } else if (firstTime) {
    pending = {};
  }
  savePending();
  writeJson(SYNCED_KEY, [userId, ...synced.filter((id) => id !== userId)]);
  setState(fromSnapshot(snapshot));
  await flushClientSettings();
};

export function stopClientSettingsSync() {
  session += 1;
  transport = null;
  clearTimer();
  if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  if (state.ready) setState({ ...state, ready: false });
}

export const getClientSettings = () => state;

export const subscribeClientSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const reloadClientSettingsCache = (key: string | null) => {
  if (key !== APPEARANCE_STORAGE_KEY && key !== RECENT_EMOJI_KEY && key !== RECENT_REACTIONS_KEY && key !== null) return;
  const fresh = initialState();
  state = { ...fresh, version: state.version, ready: state.ready };
  emit();
};

export const resetClientSettingsForTests = () => {
  stopClientSettingsSync();
  pending = {};
  state = initialState();
};

onAccountCleared(() => {
  stopClientSettingsSync();
  pending = {};
  state = initialState();
  emit();
});
