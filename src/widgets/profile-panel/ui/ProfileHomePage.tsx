import React from 'react';
import { AtSign, CalendarDays, Camera, ChevronDown, Globe, Image, Loader2, LogOut, Shield, Smartphone, Trash, Users } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { formatDate } from '@/shared/utils/dateFormatters';
import type { User } from '@/entities/user';
import type { ProfileSettingsRow } from './ProfileSettingsRows';
import ProfileSettingsRows from './ProfileSettingsRows';

interface ProfileHomePageProps {
  username: string; userData: Pick<User, 'username' | 'created_at'>; avatarUrl: string; hasCustomAvatar: boolean;
  displayName: string; bio: string; language: 'en' | 'ru'; setLanguage: (language: 'en' | 'ru') => void;
  setIsAvatarViewerOpen: (open: boolean) => void; setIsGroupModalOpen: (open: boolean) => void;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>; setAvatarCropUrl: React.Dispatch<React.SetStateAction<string | null>>;
  settingsRows: ProfileSettingsRow[]; futureSettingsRows: ProfileSettingsRow[];
  blockUsername: string; setBlockUsername: (username: string) => void; handleBlockUser: (usernameOverride?: string) => void;
  isBlockingUser: boolean; isBlockDmContactsCollapsed: boolean; setIsBlockDmContactsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  blockDmContactSuggestions: Array<{ username: string; display_name?: string | null; avatar_url?: string | null }>;
  getAvatarUrl: (avatarUrl?: string | null) => string;
  blockedUsers: Array<Pick<User, 'username' | 'display_name'>>; handleUnblockUser: (username: string) => void;
  isUnblockingUser: boolean; handleLogout: () => void; isLoggingOut: boolean;
  handleDeleteAccount: () => void; isDeletingAccount: boolean;
}

const ProfileHomePage: React.FC<ProfileHomePageProps> = (props) => {
  const { translations } = useLanguage();
  const { username, userData, avatarUrl, hasCustomAvatar, displayName, bio, language, setLanguage, setIsAvatarViewerOpen, setIsGroupModalOpen, setAvatarFile, setAvatarCropUrl, settingsRows, futureSettingsRows, blockUsername, setBlockUsername, handleBlockUser, isBlockingUser, isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed, blockDmContactSuggestions, getAvatarUrl, blockedUsers, handleUnblockUser, isUnblockingUser, handleLogout, isLoggingOut, handleDeleteAccount, isDeletingAccount } = props;
  return (
    <>
          <div className="px-6 pb-5 pt-7 text-center">
            <div className="relative mx-auto h-28 w-28">
              {hasCustomAvatar ? (
                <button
                  type="button"
                  onClick={() => setIsAvatarViewerOpen(true)}
                  className="block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="View profile picture history"
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90"
                  />
                </button>
              ) : (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm"
                />
              )}
              <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      const tempUrl = URL.createObjectURL(file);
                      setAvatarCropUrl(tempUrl);
                    }
                  }}
                />
              </label>
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold leading-tight text-gray-950">{displayName}</h3>
            <p className="mt-1 break-words text-sm text-gray-500">@{userData.username}</p>
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
                    <span className="block truncate text-sm font-medium text-gray-900">@{userData.username}</span>
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
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <Globe className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs text-gray-500">{translations.language || 'Language'}</span>
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {language === 'ru' ? 'Русский' : 'English'}
                      </span>
                    </div>
                  </div>
                  <div className="grid h-9 grid-cols-2 rounded-md border border-gray-200 bg-gray-100 p-1 sm:w-36">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                        window.location.reload();
                      }}
                      className={`rounded px-3 text-xs font-medium transition-colors ${
                        language === 'en'
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-gray-600 hover:text-gray-950'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('ru');
                        window.location.reload();
                      }}
                      className={`rounded px-3 text-xs font-medium transition-colors ${
                        language === 'ru'
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-gray-600 hover:text-gray-950'
                      }`}
                    >
                      RU
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <ProfileSettingsRows title={translations.settings || 'Settings'} description={translations.manageAccountSettings || 'Manage privacy, sessions, and account preferences.'} rows={settingsRows} futureRows={futureSettingsRows} />

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.blockedUsers || 'Blocked users'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.blockedUsersDescription || 'Blocked users cannot message, invite, or see private profile details.'}</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={blockUsername}
                  onChange={(event) => setBlockUsername(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleBlockUser()}
                  placeholder={translations.enterUsername || 'Enter username'}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleBlockUser}
                  disabled={!blockUsername.trim() || isBlockingUser}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isBlockingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : translations.block || 'Block'}
                </button>
              </div>
              {blockDmContactSuggestions.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-md border border-dashed border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsBlockDmContactsCollapsed((collapsed) => !collapsed)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                    aria-expanded={!isBlockDmContactsCollapsed}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">
                        {translations.directMessages || 'Direct messages'}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {blockDmContactSuggestions.length} {translations.available || 'available'}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${isBlockDmContactsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isBlockDmContactsCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="max-h-44 overflow-y-auto border-t border-gray-200 p-1">
                        {blockDmContactSuggestions.map((contact) => (
                          <button
                            key={contact.username}
                            type="button"
                            onClick={() => handleBlockUser(contact.username)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-white"
                          >
                            <img src={getAvatarUrl(contact.avatar_url)} alt={contact.username} className="h-8 w-8 rounded-full object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-900">{contact.display_name || contact.username}</span>
                              <span className="block truncate text-xs text-gray-500">@{contact.username}</span>
                            </span>
                            <Shield className="h-4 w-4 text-gray-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-3 rounded-md border border-gray-200">
                {blockedUsers.length ? blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.username} className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800">{blockedUser.display_name || blockedUser.username}</div>
                      <div className="truncate text-xs text-gray-500">@{blockedUser.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockUser(blockedUser.username)}
                      disabled={isUnblockingUser}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {translations.unblock || 'Unblock'}
                    </button>
                  </div>
                )) : (
                  <div className="px-3 py-3 text-sm text-gray-500">{translations.noBlockedUsers || 'No blocked users'}</div>
                )}
              </div>
            </section>

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
