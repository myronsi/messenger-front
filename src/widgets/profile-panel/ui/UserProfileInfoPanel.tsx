import React from 'react';
import { Ban, Info, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateOnly } from '@/shared/utils/dateFormatters';
import CopyableUsername from '@/shared/ui/CopyableUsername';
import type { AppLanguage } from '@/shared/lang/languages';

interface UserProfileInfoPanelProps {
  username: string;
  language: AppLanguage;
  bio?: string;
  actionError: string | null;
  isCurrentUser: boolean;
  isBlocked: boolean;
  isBlockActionLoading: boolean;
  canShowCreatedAt: boolean;
  createdAt?: string;
  canDeleteChat: boolean;
  onDeleteChat: () => void;
  onBlockToggle: () => void;
  onConfirmBlock: () => void;
}

const UserProfileInfoPanel: React.FC<UserProfileInfoPanelProps> = ({
  username, language, bio, actionError, isCurrentUser, isBlocked, isBlockActionLoading,
  canShowCreatedAt, createdAt, canDeleteChat, onDeleteChat,
  onBlockToggle, onConfirmBlock,
}) => {
  const { translations } = useLanguage();
  return (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      {actionError && <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{actionError}</div>}
      {bio && (
        <section className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-subtle-foreground">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>{translations.bio}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">{bio}</p>
        </section>
      )}
      <section className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.account || 'Account'}</p>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{translations.userName || 'Username'}</span>
            <CopyableUsername username={username} />
          </div>
          {canShowCreatedAt && createdAt && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{translations.created || 'Created'}</span>
              <span className="min-w-0 truncate font-medium text-foreground">{formatDateOnly(createdAt, language)}</span>
            </div>
          )}
        </div>
      </section>
      {canDeleteChat && (
        <button onClick={onDeleteChat} className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft">
          <Trash2 className="h-4 w-4" />{translations.deleteChat}
        </button>
      )}
      {!isCurrentUser && (
        <button
          onClick={isBlocked ? onBlockToggle : onConfirmBlock}
          disabled={isBlockActionLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
            isBlocked ? 'border-border text-primary hover:bg-accent/60 disabled:text-muted-foreground' : 'border-destructive/30 text-destructive hover:bg-destructive-soft disabled:text-muted-foreground'
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
