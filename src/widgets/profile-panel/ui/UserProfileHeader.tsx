import React from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';

interface UserProfileHeaderProps {
  avatarUrl: string;
  hasCustomAvatar: boolean;
  displayName: string;
  username: string;
  isCurrentUser: boolean;
  isEditingContactName: boolean;
  customNameInput: string;
  setCustomNameInput: (name: string) => void;
  onSaveContactName: () => void;
  onCancelContactNameEdit: () => void;
  onEditContactName: () => void;
  isSavingContactName: boolean;
  accountDisplayName: string;
  isOnline: boolean;
  lastSeen?: string | null;
  onAvatarHistory: () => void;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = (props) => {
  const { translations } = useLanguage();
  const {
    avatarUrl, hasCustomAvatar, displayName, username, isCurrentUser, isEditingContactName, customNameInput,
    setCustomNameInput, onSaveContactName, onCancelContactNameEdit, onEditContactName, isSavingContactName,
    accountDisplayName, isOnline, lastSeen, onAvatarHistory,
  } = props;
  return (
        <div className="px-5 pb-3 pt-5 text-center md:pt-4">
          {hasCustomAvatar ? (
            <button
              onClick={onAvatarHistory}
              className="mx-auto block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="View profile picture history"
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90 md:h-20 md:w-20"
              />
            </button>
          ) : (
            <img
              src={avatarUrl}
              alt={displayName}
              className="mx-auto h-24 w-24 rounded-full border border-gray-200 object-cover shadow-sm md:h-20 md:w-20"
            />
          )}
          <h3 className="mt-3 break-words text-xl font-semibold leading-tight text-gray-950">{displayName}</h3>
          <p className="mt-1 break-words text-sm text-gray-500">@{username}</p>
          {!isCurrentUser && (
            <div className="mt-2 flex justify-center px-2">
              {isEditingContactName ? (
                <div className="flex w-full max-w-xs items-center gap-1">
                  <input
                    autoFocus
                    value={customNameInput}
                    onChange={(event) => setCustomNameInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onSaveContactName();
                      if (event.key === 'Escape') onCancelContactNameEdit();
                    }}
                    maxLength={50}
                    placeholder={accountDisplayName}
                    className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={onSaveContactName}
                    disabled={isSavingContactName}
                    className="rounded-md p-2 text-primary transition-colors hover:bg-gray-100 disabled:opacity-50"
                    aria-label={translations.save || 'Save'}
                  >
                    {isSavingContactName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelContactNameEdit}
                    disabled={isSavingContactName}
                    className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                    aria-label={translations.cancel || 'Cancel'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="group flex max-w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                  <span className="min-w-0 truncate">
                    {(translations.accountName || 'Account name')}: {accountDisplayName}
                  </span>
                  <button
                    type="button"
                    onClick={onEditContactName}
                    className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-800 group-hover:opacity-100 focus:opacity-100"
                    aria-label={translations.customName || 'Custom name'}
                    title={translations.customName || 'Custom name'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mt-2 inline-flex max-w-full items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            <span className={`mr-2 h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span className="truncate">{getPresenceLabel(isOnline, lastSeen)}</span>
          </div>
        </div>

  );
};

export default UserProfileHeader;
