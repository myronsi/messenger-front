import type { MouseEvent } from 'react';
import { UserRound } from 'lucide-react';
import { useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { navigateInApp, openOwnLink } from '@/shared/lib/ownLink';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import type { MessageContact } from '../model/richTypes';
import { ActionButton, Shell } from './AppLinkCard';

const openChat = (username: string) => navigateInApp(`/dm/@${encodeURIComponent(username)}`);
const openProfile = (username: string) => { openOwnLink(`/@${username}`); };

interface ContactMessageProps {
  contact: MessageContact;
  isMine: boolean;
}

export const ContactMessage = ({ contact, isMine }: ContactMessageProps) => {
  const { translations } = useLanguage();
  const t = translations.contactShare;
  const me = getTokenSubject(useAccessToken());
  const { user } = contact;
  if (!user || user.is_deleted) {
    return (
      <div data-testid="contact-message" className="flex w-60 max-w-full items-center gap-3 py-1.5">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isMine ? 'bg-primary-foreground/15' : 'bg-foreground/10')}>
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-sm opacity-80">{t.unavailable}</span>
      </div>
    );
  }
  const name = user.display_name;
  const self = !!me && String(me) === String(user.id);
  const viewProfile = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openProfile(user.username);
  };
  return (
    <div data-testid="contact-message" className="[&>div]:pb-0">
      <Shell isMine={isMine} grow={false} standalone={false} label={name} title={name} subtitle={`@${user.username}`}
        onOpen={() => openProfile(user.username)}
        media={(
          <span className="flex justify-center py-2">
            <AuthenticatedImage src={resolveMediaUrl(user.avatar_url)} initialsFrom={name} alt={name} className="h-[72px] w-[72px] rounded-full object-cover" />
          </span>
        )}
        action={self
          ? <span className="shrink-0 text-xs opacity-75">{t.thisIsYou}</span>
          : <ActionButton isMine={isMine} label={t.message} onClick={() => openChat(user.username)} />}
        footer={(
          <button type="button" onClick={viewProfile}
            className={cn('block w-full border-t py-2 text-center text-sm font-medium focus-visible:outline-none',
              isMine ? 'border-primary-foreground/20' : 'border-border/60 text-primary')}>
            {t.viewProfile}
          </button>
        )} />
    </div>
  );
};
