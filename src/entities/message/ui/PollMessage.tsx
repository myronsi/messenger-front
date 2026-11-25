import { useState } from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import { isPersistedId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { Progress } from '@/shared/ui/progress';
import type { Message } from '../model/types';
import type { MessagePoll } from '../model/richTypes';
import { isPollClosed, pollShowsResults } from '../model/richMessage';
import { pollCountdown, usePollNow } from '../model/pollTime';
import { submitPollVote } from '../model/pollActions';
import { useMessageChatId } from '../model/messageChat';
import { PollVotersDialog } from './PollVotersDialog';

type Plural = { one: string; few: string; many: string; other: string };

const percentOf = (count: number | null, total: number | null) => (count && total ? Math.round((count / total) * 100) : 0);

const pollKind = (poll: MessagePoll, words: { anonymousPoll: string; publicPoll: string; quiz: string; anonymousQuiz: string }) => {
  if (poll.quiz) return poll.anonymous ? words.anonymousQuiz : words.quiz;
  return poll.anonymous ? words.anonymousPoll : words.publicPoll;
};

interface OptionRowProps {
  text: string;
  index: number;
  poll: MessagePoll;
  isMine: boolean;
  results: boolean;
  chosen: boolean;
  disabled: boolean;
  onPress?: () => void;
  correctLabel: string;
  wrongLabel: string;
}

const Mark = ({ poll, index, chosen, results, isMine, multiple }: Pick<OptionRowProps, 'poll' | 'index' | 'chosen' | 'results' | 'isMine'> & { multiple: boolean }) => {
  const correct = poll.options[index]?.is_correct;
  if (results && correct === true) return <Check className="h-4 w-4 text-success" aria-hidden="true" />;
  if (results && correct === false && chosen) return <X className="h-4 w-4 text-destructive" aria-hidden="true" />;
  return (
    <span aria-hidden="true" className={cn('flex h-4 w-4 items-center justify-center border-[1.5px]', multiple ? 'rounded-[4px]' : 'rounded-full',
      chosen ? (isMine ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-primary bg-primary text-primary-foreground')
        : (isMine ? 'border-primary-foreground/60' : 'border-muted-foreground/60'))}>
      {chosen && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
};

const OptionRow = ({ text, index, poll, isMine, results, chosen, disabled, onPress, correctLabel, wrongLabel }: OptionRowProps) => {
  const option = poll.options[index];
  const percent = percentOf(option?.voter_count ?? null, poll.total_voters);
  const correct = results ? option?.is_correct : undefined;
  const status = correct === true ? correctLabel : correct === false && chosen ? wrongLabel : undefined;
  return (
    <button type="button" data-testid="poll-option" disabled={disabled || !onPress} onClick={(event) => { event.stopPropagation(); onPress?.(); }}
      role={results ? undefined : poll.multiple_answers ? 'checkbox' : 'radio'} aria-checked={results ? undefined : chosen}
      aria-label={status ? `${text}, ${status}` : undefined}
      className="block w-full rounded-lg py-1.5 text-left disabled:cursor-default enabled:hover:opacity-90">
      <span className="flex items-center gap-2">
        {results
          ? <span className="w-9 shrink-0 text-xs font-semibold tabular-nums">{percent}%</span>
          : null}
        <span className="min-w-0 flex-1 text-sm leading-snug">{text}</span>
        <Mark poll={poll} index={index} chosen={chosen} results={results} isMine={isMine} multiple={poll.multiple_answers} />
      </span>
      {results && (
        <Progress value={percent} aria-hidden="true"
          className={cn('mt-1 h-1.5', isMine ? 'bg-primary-foreground/25 [&>div]:bg-primary-foreground' : 'bg-foreground/10')} />
      )}
    </button>
  );
};

interface PollMessageProps {
  message: Message;
  poll: MessagePoll;
  isMine: boolean;
}

export const PollMessage = ({ message, poll, isMine }: PollMessageProps) => {
  const { translations, language } = useLanguage();
  const t = translations.polls;
  const chatId = useMessageChatId();
  const now = usePollNow(poll);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [voters, setVoters] = useState<number | null>(null);
  const closed = isPollClosed(poll, now);
  const results = pollShowsResults(poll);
  const voted = poll.my_votes.length > 0;
  const live = isPersistedId(message.id) && chatId !== undefined;
  const canVote = live && !closed && !voted;
  const showBars = results && (!canVote || picked.length === 0);
  const count = (words: Plural, value: number) => {
    const category = new Intl.PluralRules(localeOf(language)).select(value);
    return fillTemplate(category in words ? words[category as keyof Plural] : words.other, { count: String(value) });
  };

  const vote = async (options: number[]) => {
    if (chatId === undefined || !live || busy) return;
    setBusy(true);
    if (await submitPollVote({ chatId, messageId: message.id }, options, t)) setPicked([]);
    setBusy(false);
  };
  const press = (index: number) => {
    if (canVote && !poll.multiple_answers) return () => { void vote([index]); };
    if (canVote) return () => setPicked((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
    if (results && !poll.anonymous && live && (poll.options[index]?.voter_count ?? 0) > 0) return () => setVoters(index);
    return undefined;
  };
  const footer = closed ? t.closed
    : poll.close_at ? fillTemplate(t.closesIn, { time: pollCountdown(Date.parse(poll.close_at) - now, localeOf(language)) }) : null;
  const total = poll.total_voters === null ? null : poll.total_voters === 0 ? t.noVotes : count(t.votes, poll.total_voters);

  return (
    <div data-testid="poll-message" className="w-64 max-w-full py-1">
      <p className="whitespace-pre-wrap text-[15px] font-semibold leading-snug">{poll.question}</p>
      <p className={cn('mb-1.5 text-xs', isMine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
        {pollKind(poll, t)}{canVote && poll.multiple_answers ? ` · ${t.chooseSeveral}` : ''}
      </p>
      <div role={canVote ? (poll.multiple_answers ? 'group' : 'radiogroup') : undefined} aria-label={poll.question}>
        {poll.options.map((option, index) => (
          <OptionRow key={`${index}:${option.text}`} text={option.text} index={index} poll={poll} isMine={isMine}
            results={showBars} chosen={poll.my_votes.includes(index) || picked.includes(index)} disabled={busy}
            onPress={press(index)} correctLabel={t.correct} wrongLabel={t.wrong} />
        ))}
      </div>
      {canVote && poll.multiple_answers && (
        <button type="button" disabled={busy || picked.length === 0} onClick={(event) => { event.stopPropagation(); void vote(picked); }}
          className={cn('motion-press mt-1.5 w-full rounded-full py-1.5 text-sm font-medium disabled:opacity-50',
            isMine ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground')}>
          {t.vote}
        </button>
      )}
      {results && poll.explanation && (
        <p className={cn('mt-2 flex gap-2 rounded-lg p-2 text-xs leading-snug', isMine ? 'bg-primary-foreground/15' : 'bg-foreground/5')}>
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span><span className="sr-only">{t.explanation}: </span>{poll.explanation}</span>
        </p>
      )}
      {(total || footer) && (
        <p data-testid="poll-footer" className={cn('mt-1.5 text-xs', isMine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
          {[total, footer].filter(Boolean).join(' · ')}
        </p>
      )}
      {voters !== null && chatId !== undefined && (
        <PollVotersDialog chatId={chatId} messageId={message.id} option={voters} optionText={poll.options[voters]?.text ?? ''}
          onClose={() => setVoters(null)} />
      )}
    </div>
  );
};
