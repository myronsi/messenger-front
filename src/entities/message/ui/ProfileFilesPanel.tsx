import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { genericFileType, useFileTypes } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import type { ChatFile } from '../model/types';
import FileMessage from './FileMessage';

interface ProfileFilesPanelProps {
  files: ChatFile[];
  isLoading?: boolean;
  error?: string | null;
  currentUsername?: string;
  onJumpToMessage?: (messageId: EntityId) => void;
}

export const ProfileFilesPanel: React.FC<ProfileFilesPanelProps> = ({ files, isLoading, error, currentUsername, onJumpToMessage }) => {
  const { translations, language } = useLanguage();
  const { getFileTypeConfig } = useFileTypes();
  const isMobile = !!useIsMobile();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{translations.chatFiles}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</div>
      ) : isLoading && files.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-3">
          {files.map((file) => {
            const name = file.file_name || translations.genericFile;
            const isMine = !!currentUsername && file.sender_username?.toLowerCase() === currentUsername.toLowerCase();
            const when = `${formatDateLabel(file.timestamp, language, today, yesterday)}, ${formatTime(file.timestamp, language)}`;
            return (
              <div key={file.id} data-testid="profile-file" className="flex flex-col items-start">
                <div className="w-full max-w-full rounded-bubble bg-accent px-3 py-2 text-accent-foreground">
                  <FileMessage config={getFileTypeConfig(name) ?? genericFileType(translations.genericFile)} fileName={name}
                    fileUrl={resolveMediaUrl(file.file_url ?? '')} isMobile={isMobile} fileSize={file.file_size} />
                  {file.caption && <div className="mt-1 line-clamp-2 text-sm">{file.caption}</div>}
                </div>
                <div className="mt-1 flex max-w-full items-center gap-2 px-1 text-[11px] text-muted-foreground">
                  <span className="min-w-0 truncate">{[isMine ? translations.replyFromYou : file.sender, when].filter(Boolean).join(' · ')}</span>
                  {onJumpToMessage && isPersistedId(file.id) && (
                    <button type="button" onClick={() => onJumpToMessage(file.id)} className="shrink-0 font-medium text-primary hover:underline">
                      {translations.showInChat}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{translations.noChatFiles}</div>
      )}
    </section>
  );
};
