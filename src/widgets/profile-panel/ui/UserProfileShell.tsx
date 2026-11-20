import React from 'react';
import { UserRound } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { ProfileCloseButton } from '@/shared/ui/profile/ProfileHero';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { UserProfileSkeleton } from '@/shared/ui/messenger-skeletons';
import { ProfilePageBackdrop } from '@/shared/ui/profile/ProfileBackgroundFill';
import type { ProfileBackground } from '@/entities/user';

interface UserProfileShellProps {
  children: React.ReactNode;
  onClose: () => void;
  hideBackOnMobile?: boolean;
  hideBack?: boolean;
  background?: ProfileBackground | null;
}

export const UserProfileShell: React.FC<UserProfileShellProps> = ({ children, onClose, hideBackOnMobile = false, hideBack = false, background }) => {
  const { translations } = useLanguage();
  const isMobile = useIsMobile();
  return (
    <div className="relative isolate flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      <ProfilePageBackdrop background={background} />
      <h2 className="sr-only">{translations.userProfile}</h2>
      {!hideBack && !(isMobile && hideBackOnMobile) && (
        <ProfileCloseButton mobile={isMobile} onClick={onClose} backLabel={translations.back || 'Back'} closeLabel={translations.close}
          className={`absolute top-3 z-20 text-white ${isMobile ? 'left-1.5' : 'right-1.5'}`} />
      )}
      <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">{children}</div>
    </div>
  );
};

interface UserProfileStateProps {
  isLoading: boolean;
  unavailable: boolean;
  onClose: () => void;
  hideBackOnMobile?: boolean;
  hideBack?: boolean;
}

export const UserProfileState: React.FC<UserProfileStateProps> = ({ isLoading, unavailable, onClose, hideBackOnMobile, hideBack }) => {
  const { translations } = useLanguage();
  if (isLoading) return <UserProfileShell onClose={onClose} hideBackOnMobile={hideBackOnMobile} hideBack={hideBack}><UserProfileSkeleton /></UserProfileShell>;
  if (!unavailable) return null;
  return (
    <UserProfileShell onClose={onClose} hideBack={hideBack}>
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-full bg-muted p-4"><UserRound className="h-8 w-8 text-muted-foreground" /></div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{translations.userProfile}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">{translations.accountDeletedOrUnavailable}</p>
      </div>
    </UserProfileShell>
  );
};
