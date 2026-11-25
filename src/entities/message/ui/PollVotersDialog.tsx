import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { fetchPollVoters, type PollVotersPage } from '../api/pollApi';

interface PollVotersDialogProps {
  chatId: EntityId;
  messageId: EntityId;
  option: number;
  optionText: string;
  onClose: () => void;
}

export const PollVotersDialog = ({ chatId, messageId, option, optionText, onClose }: PollVotersDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState<PollVotersPage>({ items: [], next_cursor: null });
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const load = useCallback(async (after: string | null) => {
    setState('loading');
    try {
      const next = await fetchPollVoters(chatId, messageId, option, after);
      setPage((current) => ({ items: after ? [...current.items, ...next.items] : next.items, next_cursor: next.next_cursor }));
      setState('ready');
    } catch {
      setState('failed');
    }
  }, [chatId, messageId, option]);

  useEffect(() => { void load(null); }, [load]);

  const close = () => {
    setOpen(false);
    window.setTimeout(onClose, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-w-sm" onClick={(event) => event.stopPropagation()}>
        <DialogHeader><DialogTitle className="pr-6 leading-snug">{fillTemplate(t.whoVoted, { option: optionText })}</DialogTitle></DialogHeader>
        <ul data-testid="poll-voters" className="-mx-2 max-h-80 overflow-y-auto">
          {page.items.map((user) => {
            const name = user.is_deleted ? t.deletedAccount : user.contact_display_name || user.display_name;
            return (
              <li key={String(user.id)} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <AuthenticatedImage src={resolveMediaUrl(user.avatar_url)} initialsFrom={name} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium"><EmojiText text={name} /></span>
                  {!user.is_deleted && user.username && <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        {state === 'ready' && page.items.length === 0 && <p className="text-sm text-muted-foreground">{t.noVoters}</p>}
        {state === 'failed' && <p role="alert" className="text-sm text-destructive">{t.votersFailed}</p>}
        {page.next_cursor && state !== 'loading' && (
          <button type="button" onClick={() => void load(page.next_cursor)}
            className="motion-press self-start rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent">
            {t.loadMore}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};
