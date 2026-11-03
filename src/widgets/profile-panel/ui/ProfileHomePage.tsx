import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { AtSign, CalendarDays, Image, Loader2, LogOut, Pencil, Trash, Users } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDate } from '@/shared/utils/dateFormatters';
import type { User } from '@/entities/user';
import type { ProfileSettingsRow } from './ProfileSettingsRows';
import ProfileSettingsRows from './ProfileSettingsRows';
import AboutSection from './AboutSection';
import CopyableUsername from '@/shared/ui/CopyableUsername';

interface ProfileHomePageProps {
  username: string; userData: Pick<User, 'username' | 'created_at'>; avatarUrl: string; hasCustomAvatar: boolean;
  displayName: string; bio: string; language: 'en' | 'ru';
  setIsAvatarViewerOpen: (open: boolean) => void; setIsGroupModalOpen: (open: boolean) => void;
  onEditProfile: () => void;
  settingsRows: ProfileSettingsRow[]; futureSettingsRows: ProfileSettingsRow[];
  handleLogout: () => void; isLoggingOut: boolean;
  handleDeleteAccount: () => void; isDeletingAccount: boolean;
}

const ProfileHomePage: React.FC<ProfileHomePageProps> = (props) => {
  const { translations } = useLanguage();
  const {
    userData, avatarUrl, hasCustomAvatar, displayName, bio, language, setIsAvatarViewerOpen,
    setIsGroupModalOpen, onEditProfile, settingsRows, futureSettingsRows, handleLogout, isLoggingOut, handleDeleteAccount, isDeletingAccount,
  } = props;
  return (
    <>
          <div className="px-6 pb-5 pt-7 text-center">
            <div className="relative mx-auto h-28 w-28">
              {hasCustomAvatar ? (
                <button
                  type="button"
                  onClick={() => setIsAvatarViewerOpen(true)}
                  className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label="View profile picture history"
                >
                  <AuthenticatedImage
                    src={avatarUrl}
                    alt={displayName}
                    className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90"
                  />
                </button>
              ) : (
                <AuthenticatedImage
                  src={avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm"
                />
              )}
              <button
                type="button"
                onClick={onEditProfile}
                aria-label={translations.editProfileAction}
                title={translations.editProfileAction}
                className="motion-press absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold leading-tight text-gray-950">{displayName}</h3>
            <p className="mx-auto mt-3 max-w-sm whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
              {bio || translations.noBio || 'No bio'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-y border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">{translations.createGroup}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAvatarViewerOpen(true)}
              disabled={!hasCustomAvatar}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              <Image className="h-5 w-5" />
              <span className="text-xs font-medium">{translations.avatarHistory || 'Avatar history'}</span>
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.account || 'Account'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.accountDetails || 'Username, account age, and app language.'}</p>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                    <AtSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs text-gray-500">{translations.userName}</span>
                    <CopyableUsername username={userData.username} className="text-sm" />
                  </div>
                </div>
                {userData.created_at && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-gray-500">{translations.created || 'Created'}</span>
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {formatDate(userData.created_at, language)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <ProfileSettingsRows title={translations.settings || 'Settings'} description={translations.manageAccountSettings || 'Manage privacy, sessions, and account preferences.'} rows={settingsRows} futureRows={futureSettingsRows} />

            <AboutSection />

            <section className="space-y-2">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {translations.logout}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                {translations.deleteAccount}
              </button>
            </section>
          </div>
    </>
  );
};

export default ProfileHomePage;
