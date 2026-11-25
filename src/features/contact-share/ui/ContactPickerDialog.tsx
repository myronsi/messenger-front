import { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import type { ContactUser, RichSend } from '@/entities/message';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useSearchUsersQuery } from '@/entities/user';
import { useGetCurrentUserQuery } from '@/shared/api/currentUserApi';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { chatCandidates, matchesContact, searchCandidates } from '../model/contactCandidates';

interface ContactPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (send: Extract<RichSend, { type: 'contact' }>) => void;
}

const Row = ({ user, label, onPick }: { user: ContactUser; label?: string; onPick: (user: ContactUser) => void }) => (
  <li>
    <button type="button" data-testid="contact-candidate" onClick={() => onPick(user)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent">
      <AuthenticatedImage src={resolveMediaUrl(user.avatar_url, DEFAULT_AVATAR)} initialsFrom={user.display_name} alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium"><EmojiText text={label ?? user.display_name} /></span>
        <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
      </span>
    </button>
  </li>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h4 className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
    <ul>{children}</ul>
  </section>
);

export const ContactPickerDialog = ({ open, onClose, onSend }: ContactPickerDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.contactShare;
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query.trim().replace(/^@/, ''), 250);
  const { data: me } = useGetCurrentUserQuery(undefined, { skip: !open });
  const { data: chats } = useGetOneOnOneChatsQuery(me?.username ?? '', { skip: !open || !me?.username });
  const { data: found } = useSearchUsersQuery(term, { skip: !open || term.length < 2 });
  const myId = me ? String(me.id) : undefined;
  const direct = useMemo(() => chatCandidates(chats?.chats ?? [], myId).filter((user) => matchesContact(user, query)), [chats, myId, query]);
  const others = useMemo(() => (term.length < 2 ? [] : searchCandidates(found?.users ?? [], direct, myId)), [found, direct, myId, term]);

  const close = () => {
    onClose();
    window.setTimeout(() => setQuery(''), 200);
  };
  const pick = (user: ContactUser) => {
    onSend({ type: 'contact', contact: { user_id: String(user.id) }, user });
    close();
  };
  const self: ContactUser | null = me ? { id: String(me.id), username: me.username, display_name: me.display_name, avatar_url: me.avatar_url } : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-md flex-col">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} className="pl-9" />
        </label>
        <div data-testid="contact-picker" className="-mx-2 min-h-0 flex-1 overflow-y-auto">
          {self && !query && (
            <ul>
              <li>
                <button type="button" onClick={() => pick(self)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-accent">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"><UserRound className="h-5 w-5" /></span>
                  {t.shareMyCard}
                </button>
              </li>
            </ul>
          )}
          {direct.length > 0 && <Section title={t.chats}>{direct.map((user) => <Row key={String(user.id)} user={user} onPick={pick} />)}</Section>}
          {others.length > 0 && <Section title={t.contacts}>{others.map((user) => <Row key={String(user.id)} user={user} onPick={pick} />)}</Section>}
          {query && direct.length === 0 && others.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t.noResults}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
