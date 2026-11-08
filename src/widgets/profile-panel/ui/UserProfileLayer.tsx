import React from 'react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { windowSlide } from '@/shared/ui/windowMotion';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface UserProfileLayerProps {
  isMobile: boolean;
  isClosing: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const UserProfileLayer: React.FC<UserProfileLayerProps> = ({ isMobile, isClosing, onClose, children }) => {
  const { translations } = useLanguage();
  if (isMobile) {
    return (
      <ModalSurface label={translations.userProfile}
        className={`fixed inset-0 z-[1000] bg-white ${windowSlide(!isClosing)}`}>
        {children}
      </ModalSurface>
    );
  }
  return (
    <ModalSurface label={translations.userProfile}
      data-testid="user-profile-backdrop"
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-6 py-6 transition-opacity duration-200 ease-out ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className={`h-[min(780px,calc(100vh-3rem))] w-[420px] max-w-full overflow-hidden rounded-lg bg-white shadow-2xl transition-all duration-200 ease-out ${
          isClosing ? 'translate-y-3 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
        }`}
      >
        {children}
      </div>
    </ModalSurface>
  );
};
