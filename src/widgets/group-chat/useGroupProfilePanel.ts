import { useCallback, useEffect, useState } from 'react';
import type { GroupProfileConfirmState } from './GroupProfileTypes';

const PROFILE_CLOSE_ANIMATION_MS = 200;

// Open/close animation state of the group profile dialog and its pending confirmation.
export const useGroupProfilePanel = () => {
  const [isGroupProfileOpen, setIsGroupProfileOpen] = useState(false);
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
    }, PROFILE_CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isGroupProfileOpen, renderGroupProfile]);

  const requestCloseGroupProfile = useCallback(() => {
    if (isGroupProfileClosing) return;
    setIsGroupProfileOpen(false);
  }, [isGroupProfileClosing]);

  const openGroupProfile = useCallback(() => setIsGroupProfileOpen(true), []);

  return { renderGroupProfile, isGroupProfileClosing, groupConfirm, setGroupConfirm, openGroupProfile, requestCloseGroupProfile };
};