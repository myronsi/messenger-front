import { useState } from 'react';

export type MainTab = 'chats' | 'calls' | 'settings' | 'profile';
type RouteTab = 'settings' | 'profile';

interface UseMainTabOptions {
  routeTab: RouteTab | null;
  showRouteTab: (tab: RouteTab | null) => void;
}

export const useMainTab = ({ routeTab, showRouteTab }: UseMainTabOptions) => {
  const [tab, setTab] = useState<'chats' | 'calls'>('chats');
  const [isEditingProfile, setEditingProfile] = useState(false);
  const active: MainTab = routeTab ?? tab;
  const select = (next: MainTab) => {
    setEditingProfile(false);
    if (next === 'settings' || next === 'profile') {
      showRouteTab(next);
      return;
    }
    setTab(next);
    showRouteTab(null);
  };
  return { active, select, showChats: () => setTab('chats'), isEditingProfile, setEditingProfile };
};
