import React from 'react';
import { UserRound, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { UserProfileSkeleton } from '@/shared/ui/messenger-skeletons';

interface UserProfileShellProps {
  children: React.ReactNode;
  onClose: () => void;
}

export const UserProfileShell: React.FC<UserProfileShellProps> = ({ children, onClose }) => {
  const { translations } = useLanguage();
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      <h2 className="sr-only">{translations.userProfile}</h2>
      <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-black/20 p-1.5 text-white transition-colors hover:bg-black/35" aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">{children}</div>
    </div>
  );
};

interface UserProfileStateProps {
  isLoading: boolean;
  unavailable: boolean;
  onClose: () => void;
}

export const UserProfileState: React.FC<UserProfileStateProps> = ({ isLoading, unavailable, onClose }) => {
  const { translations } = useLanguage();
  if (isLoading) return <UserProfileShell onClose={onClose}><UserProfileSkeleton /></UserProfileShell>;
  if (!unavailable) return null;
  return (
    <UserProfileShell onClose={onClose}>
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-full bg-muted p-4"><UserRound className="h-8 w-8 text-muted-foreground" /></div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{translations.userProfile}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">{translations.accountDeletedOrUnavailable}</p>
      </div>
    </UserProfileShell>
  );
};
