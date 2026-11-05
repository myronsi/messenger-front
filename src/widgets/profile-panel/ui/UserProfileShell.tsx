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
    <div className="flex h-full min-h-0 w-full flex-col bg-white text-gray-950">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-semibold">{translations.userProfile}</h2>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
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
        <div className="mb-4 rounded-full bg-gray-100 p-4"><UserRound className="h-8 w-8 text-gray-500" /></div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{translations.userProfile}</h3>
        <p className="max-w-xs text-sm text-gray-500">{translations.accountDeletedOrUnavailable}</p>
      </div>
    </UserProfileShell>
  );
};
