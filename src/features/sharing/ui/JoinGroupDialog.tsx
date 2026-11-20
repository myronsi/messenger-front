import { createPortal } from 'react-dom';
import { Link2Off, Loader2, X } from 'lucide-react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { useGetInviteQuery } from '@/entities/group';
import { joinErrorOf } from '../model/joinErrors';
import { GroupJoinCard } from './GroupJoinCard';

export const JoinGroupDialog = ({ token, onClose }: { token: string; onClose: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const { data, error, isFetching, refetch } = useGetInviteQuery(token);
  const notFound = !!error && joinErrorOf(error) === 'not_found';
  const label = data ? fillTemplate(t.joinTitle, { name: data.group.name }) : t.join;
  let body;
  if (data) {
    body = <GroupJoinCard preview={data} token={token} />;
  } else if (isFetching) {
    body = (
      <div role="status" className="flex justify-center rounded-2xl border border-border bg-card py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label={translations.loading} />
      </div>
    );
  } else if (notFound) {
    body = (
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <span className="rounded-full bg-muted p-4"><Link2Off className="h-8 w-8 text-muted-foreground" aria-hidden="true" /></span>
        <h3 className="text-lg font-semibold">{t.inviteNotAvailable}</h3>
        <p className="text-sm text-muted-foreground">{t.inviteNotAvailableHint}</p>
      </section>
    );
  } else {
    body = (
      <section role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{joinErrorOf(error) === 'too_many' ? t.tooManyRequests : t.loadFailed}</p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>{t.retry}</Button>
      </section>
    );
  }
  return createPortal(
    <ModalSurface label={label}
      className="fixed inset-0 z-[11002] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="motion-panel-in relative w-full max-w-sm">
        <button type="button" onClick={onClose} aria-label={translations.close}
          className="motion-press absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/40">
          <X className="h-4 w-4" />
        </button>
        {body}
      </div>
    </ModalSurface>,
    document.body,
  );
};
