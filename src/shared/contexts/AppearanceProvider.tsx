import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import {
  APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, THEME_CHOICES, THEME_STORAGE_KEY, applyAppearance, loadAppearance, parseAppearance, saveAppearance,
  type AppearanceSettings, type ThemeChoice,
} from '@/shared/lib/appearance/settings';
import type { ThemeTone } from '@/shared/lib/appearance/palette';
import { AppearanceContext, type AppearanceContextValue } from './AppearanceContext';

const AppearanceState: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState(loadAppearance);
  const tone: ThemeTone = resolvedTheme === 'dark' ? 'dark' : 'light';

  useLayoutEffect(() => applyAppearance(settings, tone), [settings, tone]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) setSettings(parseAppearance(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveAppearance(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setSettings(DEFAULT_APPEARANCE);
    setTheme('system');
  }, [setTheme]);

  const value = useMemo<AppearanceContextValue>(() => ({
    settings,
    theme: (THEME_CHOICES as readonly string[]).includes(theme ?? '') ? theme as ThemeChoice : 'system',
    tone,
    setTheme,
    update,
    reset,
  }), [settings, theme, tone, setTheme, update, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
};

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange
    scriptProps={{ type: 'application/json' }}>
    <AppearanceState>{children}</AppearanceState>
  </ThemeProvider>
);
