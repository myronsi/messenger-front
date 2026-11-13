import React from 'react';
import { ExternalLink, Link2, Loader2 } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel } from '@/shared/utils/dateFormatters';
import type { ChatLinkItem } from '../api/chatLinksApi';

interface ProfileLinksPanelProps {
  links: ChatLinkItem[];
  isLoading?: boolean;
  error?: string | null;
  onJumpToMessage?: (messageId: EntityId) => void;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const ProfileLinksPanel: React.FC<ProfileLinksPanelProps> = ({ links, isLoading, error, onJumpToMessage }) => {
  const { translations, language } = useLanguage();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="px-5 py-6 text-center text-sm text-destructive">{error}</p>;
  if (!links.length) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{translations.profileRework.noLinks}</p>;
  return (
    <ul data-testid="profile-links" className="space-y-1 px-3 py-2">
      {links.map((link) => (
        <li key={String(link.id)} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-accent/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <button type="button" onClick={() => onJumpToMessage?.(link.id)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{hostOf(link.url)}</span>
            <span className="block truncate text-xs text-muted-foreground">{link.text}</span>
            <span className="block text-[11px] text-muted-foreground">{link.sender} · {formatDateLabel(link.timestamp, language, today, yesterday)}</span>
          </button>
          <a href={link.url} target="_blank" rel="noreferrer noopener" aria-label={translations.profileRework.openLink}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </a>
        </li>
      ))}
    </ul>
  );
};
