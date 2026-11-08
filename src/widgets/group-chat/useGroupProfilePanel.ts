import { useCallback, useEffect, useState } from 'react';
import { isProfileOverlayOpen } from '@/shared/lib/urlOverlay';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import type { GroupProfileConfirmState } from './GroupProfileTypes';

// Open/close animation state of the group profile dialog and its pending confirmation.
export const useGroupProfilePanel = () => {
  const { overlay, open: openOverlay, closeAll: closeOverlay } = useUrlOverlay();
  const isGroupProfileOpen = isProfileOverlayOpen(overlay);
  const [renderGroupProfile, setRenderGroupProfile] = useState(false);
  const [isGroupProfileClosing, setIsGroupProfileClosing] = useState(false);
  const [groupConfirm, setGroupConfirm] = useState<GroupProfileConfirmState | null>(null);

  useEffect(() => {
    if (isGroupProfileOpen) {
      setRenderGroupProfile(true);
      setIsGroupProfileClosing(true);
      const frameId = window.requestAnimationFrame(() => setIsGroupProfileClosing(false));
      return () => window.cancelAnimationFrame(frameId);
    }

    if (!renderGroupProfile) return;
    setIsGroupProfileClosing(true);
    const timeoutId = window.setTimeout(() => {
      setRenderGroupProfile(false);
      setIsGroupProfileClosing(false);
      setGroupConfirm(null);
    }, WINDOW_MOTION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isGroupProfileOpen, renderGroupProfile]);

  const requestCloseGroupProfile = useCallback(() => {
    if (isGroupProfileClosing || !isGroupProfileOpen) return;
    closeOverlay();
  }, [closeOverlay, isGroupProfileClosing, isGroupProfileOpen]);

  const openGroupProfile = useCallback(() => openOverlay({ kind: 'profile' }), [openOverlay]);
  const openMemberProfile = useCallback((username: string) => openOverlay({ kind: 'user', username, overProfile: true }), [openOverlay]);

  return { renderGroupProfile, isGroupProfileClosing, groupConfirm, setGroupConfirm, openGroupProfile, openMemberProfile, requestCloseGroupProfile };
};