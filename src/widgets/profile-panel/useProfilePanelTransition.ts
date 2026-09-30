import { useEffect, useRef, useState } from 'react';
import type { ProfilePanelTransition, ProfilePanelView } from './ui/UserProfilePanelContent';

export const useProfilePanelTransition = (directChatId: number | undefined, username: string) => {
  const [activeView, setActiveView] = useState<ProfilePanelView>('details');
  const [panelTransition, setPanelTransition] = useState<ProfilePanelTransition | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveView('details');
    setPanelTransition(null);
  }, [directChatId, username]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const selectView = (view: ProfilePanelView, visibleOrder: ProfilePanelView[]) => {
    if (view === activeView) return;
    const direction = visibleOrder.indexOf(view) > visibleOrder.indexOf(activeView) ? 'forward' : 'back';
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setPanelTransition({ from: activeView, to: view, direction, key: Date.now() });
    setActiveView(view);
    timeoutRef.current = window.setTimeout(() => {
      setPanelTransition(null);
      timeoutRef.current = null;
    }, 340);
  };

  return { activeView, panelTransition, selectView };
};
