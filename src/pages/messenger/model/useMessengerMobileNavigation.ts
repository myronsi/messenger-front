import { useCallback, useEffect, useRef, useState } from 'react';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import type { NavigateFunction } from 'react-router-dom';
import type { CurrentChat } from './messengerRoutes';

interface MessengerMobileNavigationOptions {
  currentChat: CurrentChat | null;
  isMobile: boolean;
  navigate: NavigateFunction;
  setCurrentChat: (chat: CurrentChat | null) => void;
}

export const useMessengerMobileNavigation = ({
  currentChat,
  isMobile,
  navigate,
  setCurrentChat,
}: MessengerMobileNavigationOptions) => {
  const [mobileChatStage, setMobileChatStage] = useState<'closed' | 'open' | 'closing'>('closed');
  const [lastMobileChat, setLastMobileChat] = useState<CurrentChat | null>(currentChat);
  const mobileChatCloseTimerRef = useRef<number | null>(null);
  if (currentChat && currentChat !== lastMobileChat) setLastMobileChat(currentChat);

  const clearMobileChatCloseTimer = useCallback(() => {
    if (mobileChatCloseTimerRef.current !== null) {
      window.clearTimeout(mobileChatCloseTimerRef.current);
      mobileChatCloseTimerRef.current = null;
    }
  }, []);

  const prepareChatNavigation = useCallback(() => {
    clearMobileChatCloseTimer();
    if (isMobile) setMobileChatStage('closed');
  }, [clearMobileChatCloseTimer, isMobile]);

  const showMobileChatPanel = useCallback(() => {
    if (isMobile) requestAnimationFrame(() => setMobileChatStage('open'));
  }, [isMobile]);

  const finishBackToChats = useCallback(() => {
    clearMobileChatCloseTimer();
    setCurrentChat(null);
    setMobileChatStage('closed');
    try {
      navigate('/');
    } catch (error) {
      console.error('Error navigating back to chats:', error);
    }
  }, [clearMobileChatCloseTimer, navigate, setCurrentChat]);

  const backToChats = useCallback(() => {
    if (isMobile && currentChat) {
      clearMobileChatCloseTimer();
      setMobileChatStage('closing');
      mobileChatCloseTimerRef.current = window.setTimeout(finishBackToChats, WINDOW_MOTION_MS);
      return;
    }

    finishBackToChats();
  }, [clearMobileChatCloseTimer, currentChat, finishBackToChats, isMobile]);

  useEffect(() => {
    if (!currentChat) {
      setMobileChatStage('closed');
    } else if (isMobile) {
      requestAnimationFrame(() => setMobileChatStage('open'));
    }
  }, [currentChat, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileChatStage('closed');
      clearMobileChatCloseTimer();
    }
  }, [clearMobileChatCloseTimer, isMobile]);

  useEffect(() => {
    if (currentChat || !lastMobileChat) return;
    if (!isMobile) {
      setLastMobileChat(null);
      return;
    }
    const timeoutId = window.setTimeout(() => setLastMobileChat(null), WINDOW_MOTION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [currentChat, isMobile, lastMobileChat]);

  useEffect(() => () => clearMobileChatCloseTimer(), [clearMobileChatCloseTimer]);

  return {
    backToChats,
    mobilePanelChat: isMobile ? currentChat ?? lastMobileChat : currentChat,
    mobileChatPanelClass: currentChat && mobileChatStage === 'open'
      ? 'translate-x-0'
      : 'translate-x-full',
    prepareChatNavigation,
    showMobileChatPanel,
  };
};
