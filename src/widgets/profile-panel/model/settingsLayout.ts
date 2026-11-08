import { createContext, useContext } from 'react';

export type SettingsLayout = 'sheet' | 'pane';

export const SettingsLayoutContext = createContext<SettingsLayout>('sheet');

export const useSettingsLayout = () => useContext(SettingsLayoutContext);
