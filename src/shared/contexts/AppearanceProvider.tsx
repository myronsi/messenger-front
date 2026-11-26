import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import {
  APPEARANCE_KEYS, APPEARANCE_LOCAL_STORAGE_KEY, DEFAULT_SYNCED_APPEARANCE, THEME_CHOICES, THEME_STORAGE_KEY, applyAppearance, effectiveAppearance,
  loadLocalAppearance, parseLocalAppearance, saveLocalAppearance, type AppearanceKey, type AppearancePatch, type AppearanceSettings, type ThemeChoice,
} from '@/shared/lib/appearance/settings';
import type { ThemeTone } from '@/shared/lib/appearance/palette';
import {
  getClientSettings, reloadClientSettingsCache, subscribeClientSettings, updateClientSettings,
} from '@/shared/lib/clientSettings/clientSettingsStore';
import { WALLPAPERS_STORAGE_KEY } from '@/shared/lib/appearance/wallpaper';
import {
  getWallpapers, reloadWallpaperCache, setDefaultWallpaper, subscribeWallpapers,
} from '@/shared/lib/clientSettings/wallpaperStore';
import { AppearanceContext, type AppearanceContextValue } from './AppearanceContext';

const splitPatch = (patch: AppearancePatch, local: AppearancePatch) => {
  const shared: AppearancePatch = {};
  const own: AppearancePatch = {};
  (Object.keys(patch) as AppearanceKey[]).forEach((key) => {
    const target = key in local ? own : shared;
    Object.assign(target, { [key]: patch[key] });
  });
  return { shared, own };
};

const readAppearance = () => getClientSettings().appearance;
const readFallback = () => getWallpapers().fallback;
const useSyncedAppearance = () => useSyncExternalStore(subscribeClientSettings, readAppearance, readAppearance);
const useDefaultWallpaper = () => useSyncExternalStore(subscribeWallpapers, readFallback, readFallback);

const AppearanceState: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const synced = useSyncedAppearance();
  const fallback = useDefaultWallpaper();
  const [local, setLocal] = useState(loadLocalAppearance);
  const settings = useMemo(() => effectiveAppearance(synced, fallback, local), [synced, fallback, local]);
  const tone: ThemeTone = resolvedTheme === 'dark' ? 'dark' : 'light';

  useLayoutEffect(() => applyAppearance(settings, tone), [settings, tone]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_LOCAL_STORAGE_KEY) setLocal(parseLocalAppearance(event.newValue));
      else if (event.key === WALLPAPERS_STORAGE_KEY) reloadWallpaperCache();
      else reloadClientSettingsCache(event.key);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const writeLocal = useCallback((next: AppearancePatch) => {
    saveLocalAppearance(next);
    setLocal(next);
  }, []);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    const { shared, own } = splitPatch(patch, local);
    if (Object.keys(own).length) writeLocal({ ...local, ...own });
    const { wallpaper, ...appearance } = shared;
    if (wallpaper) setDefaultWallpaper(wallpaper);
    if (Object.keys(appearance).length) updateClientSettings({ appearance: { ...getClientSettings().appearance, ...appearance } });
  }, [local, writeLocal]);

  const setDeviceOnly = useCallback((key: AppearanceKey, enabled: boolean) => {
    if (enabled === key in local) return;
    if (enabled) {
      writeLocal({ ...local, [key]: settings[key] });
      return;
    }
    const next = { ...local };
    delete next[key];
    writeLocal(next);
  }, [local, settings, writeLocal]);

  const reset = useCallback(() => {
    writeLocal({});
    updateClientSettings({ appearance: DEFAULT_SYNCED_APPEARANCE });
    setDefaultWallpaper(null);
    setTheme('system');
  }, [setTheme, writeLocal]);

  const deviceOnly = useMemo(
    () => Object.fromEntries(APPEARANCE_KEYS.map((key) => [key, key in local])) as Record<AppearanceKey, boolean>,
    [local],
  );

  const value = useMemo<AppearanceContextValue>(() => ({
    settings,
    theme: (THEME_CHOICES as readonly string[]).includes(theme ?? '') ? theme as ThemeChoice : 'system',
    tone,
    deviceOnly,
    setTheme,
    update,
    setDeviceOnly,
    reset,
  }), [settings, theme, tone, deviceOnly, setTheme, update, setDeviceOnly, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
};

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange
    scriptProps={{ type: 'application/json' }}>
    <AppearanceState>{children}</AppearanceState>
  </ThemeProvider>
);
