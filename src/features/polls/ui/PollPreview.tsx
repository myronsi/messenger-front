import { draftPoll, PollMessage, type Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { previewPoll, type PollDraft } from '../model/pollDraft';

export const PollPreview = ({ draft, className }: { draft: PollDraft; className?: string }) => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const poll = draftPoll(previewPoll(draft, t));
  const message = { id: 'poll-preview', sender: '', content: '', timestamp: new Date().toISOString(), type: 'message', read_by: [], poll } as Message;
  return (
    <section aria-label={t.preview} className={cn('space-y-2', className)}>
      <span className="block px-1 text-[13px] font-semibold text-muted-foreground">{t.preview}</span>
      <div inert className="flex justify-end rounded-2xl border border-dashed border-input p-3.5">
        <div data-testid="poll-preview" className="bubble-out rounded-bubble rounded-br-md bg-primary px-3 pb-1.5 pt-0.5 text-primary-foreground">
          <PollMessage message={message} poll={poll} isMine />
        </div>
      </div>
    </section>
  );
};
