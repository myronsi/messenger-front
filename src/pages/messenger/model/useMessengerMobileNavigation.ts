import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { CurrentChat } from '@/app/routes/messengerRoutes';

interface MessengerMobileNavigationOptions {
  currentChat: CurrentChat | null;
  isMobile: boolean;
  navigate: NavigateFunction;
  setCurrentChat: (chat: CurrentChat | null) => void;
  setIsUserProfileOpen: (open: boolean) => void;
  setProfileUsername: (username: string | null) => void;
}

export const useMessengerMobileNavigation = ({
  currentChat,
  isMobile,
  navigate,
  setCurrentChat,
  setIsUserProfileOpen,
  setProfileUsername,
}: MessengerMobileNavigationOptions) => {
  const [mobileChatStage, setMobileChatStage] = useState<'closed' | 'open' | 'closing'>('closed');
  const mobileChatCloseTimerRef = useRef<number | null>(null);

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
    setIsUserProfileOpen(false);
    setProfileUsername(null);
    try {
      navigate('/');
    } catch (error) {
      console.error('Error navigating back to chats:', error);
    }
  }, [clearMobileChatCloseTimer, navigate, setCurrentChat, setIsUserProfileOpen, setProfileUsername]);

  const backToChats = useCallback(() => {
    if (isMobile && currentChat) {
      clearMobileChatCloseTimer();
      setMobileChatStage('closing');
      mobileChatCloseTimerRef.current = window.setTimeout(finishBackToChats, 260);
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

  useEffect(() => () => clearMobileChatCloseTimer(), [clearMobileChatCloseTimer]);

  return {
    backToChats,
    mobileChatPanelClass: currentChat && mobileChatStage === 'open'
      ? 'translate-x-0'
      : 'translate-x-full',
    prepareChatNavigation,
    showMobileChatPanel,
  };
};
