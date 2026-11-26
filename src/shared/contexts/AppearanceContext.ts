import { createContext, useContext } from 'react';
import type { AppearanceKey, AppearanceSettings, ThemeChoice } from '@/shared/lib/appearance/settings';
import type { ThemeTone } from '@/shared/lib/appearance/palette';

export interface AppearanceContextValue {
  settings: AppearanceSettings;
  theme: ThemeChoice;
  tone: ThemeTone;
  deviceOnly: Record<AppearanceKey, boolean>;
  setTheme: (theme: ThemeChoice) => void;
  update: (patch: Partial<AppearanceSettings>) => void;
  setDeviceOnly: (key: AppearanceKey, enabled: boolean) => void;
  reset: () => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within an AppearanceProvider');
  return context;
};
