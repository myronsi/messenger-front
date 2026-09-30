import React from 'react';
import { Ban, Info, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';
import { formatDateOnly } from '@/shared/utils/dateFormatters';

interface UserProfileInfoPanelProps {
  username: string;
  language: 'en' | 'ru';
  bio?: string;
  actionError: string | null;
  isCurrentUser: boolean;
  isBlocked: boolean;
  isBlockActionLoading: boolean;
  canShowCreatedAt: boolean;
  createdAt?: string;
  isOnline: boolean;
  lastSeen?: string | null;
  canDeleteChat: boolean;
  onDeleteChat: () => void;
  onBlockToggle: () => void;
  onConfirmBlock: () => void;
}

const UserProfileInfoPanel: React.FC<UserProfileInfoPanelProps> = ({
  username, language, bio, actionError, isCurrentUser, isBlocked, isBlockActionLoading,
  canShowCreatedAt, createdAt, isOnline, lastSeen, canDeleteChat, onDeleteChat,
  onBlockToggle, onConfirmBlock,
}) => {
  const { translations } = useLanguage();
  return (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      {actionError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}
      {bio && (
        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Info className="h-4 w-4 text-gray-500" />
            <span>{translations.bio}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-5 text-gray-900">{bio}</p>
        </section>
      )}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.account || 'Account'}</p>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{translations.userName || 'Username'}</span>
            <span className="min-w-0 truncate font-medium text-gray-900">@{username}</span>
          </div>
          {canShowCreatedAt && createdAt && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">{translations.created || 'Created'}</span>
              <span className="min-w-0 truncate font-medium text-gray-900">{formatDateOnly(createdAt, language)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{translations.status || 'Status'}</span>
            <span className="min-w-0 truncate font-medium text-gray-900">{getPresenceLabel(isOnline, lastSeen)}</span>
          </div>
        </div>
      </section>
      {canDeleteChat && (
        <button onClick={onDeleteChat} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
          <Trash2 className="h-4 w-4" />{translations.deleteChat}
        </button>
      )}
      {!isCurrentUser && (
        <button
          onClick={isBlocked ? onBlockToggle : onConfirmBlock}
          disabled={isBlockActionLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
            isBlocked ? 'border-gray-200 text-primary hover:bg-gray-50 disabled:text-gray-400' : 'border-red-200 text-red-600 hover:bg-red-50 disabled:text-gray-400'
          }`}
        >
          {isBlockActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          {isBlocked ? translations.unblock || 'Unblock' : translations.block || 'Block'}
        </button>
      )}
    </div>
  );
};

export default UserProfileInfoPanel;
