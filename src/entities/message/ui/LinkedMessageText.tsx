import { messageLinks } from '@/shared/lib/messageLinks';
import { trimLineEnds } from '@/shared/lib/trimChars';
import { splitByQuery, useSearchHighlight } from '@/shared/lib/searchHighlight';
import { isMentionOf, MENTION_ALL, splitMentions } from '@/shared/lib/mentions';
import { useCurrentUsername } from '@/shared/contexts/CurrentUsernameContext';
import { MessageLink } from './MessageLink';
import { MentionLink } from './MentionLink';
import { splitEmoji } from '@/shared/lib/customEmoji';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';

const Marked = ({ text, query }: { text: string; query: string }) => (
  <>{splitByQuery(text, query).map((part, index) => part.match
    ? <mark key={index} data-search-match className="rounded-sm bg-highlight text-inherit">{part.text}</mark> : part.text)}</>
);

const Highlighted = ({ text, query, large }: { text: string; query: string; large?: boolean }) => (
  <>{splitEmoji(text).map((part, index) => (part.kind === 'text'
    ? <Marked key={index} text={part.text} query={query} />
    : <CustomEmoji key={index} id={part.token.id} shortcode={part.token.shortcode} large={large} />))}</>
);

const WithMentions = ({ text, query, large, mentionsAll }: { text: string; query: string; large?: boolean; mentionsAll?: boolean }) => {
  const self = useCurrentUsername();
  return <>{splitMentions(text).map((part, index) => {
    if (!part.mention) return <Highlighted key={index} text={part.text} query={query} large={large} />;
    if (part.mention.toLowerCase() === MENTION_ALL) {
      if (!mentionsAll) return <Highlighted key={index} text={part.text} query={query} large={large} />;
      return <span key={index} data-mention-all className="rounded bg-primary/20 px-0.5 font-medium"><Marked text={part.text} query={query} /></span>;
    }
    return <MentionLink key={index} name={part.mention} own={isMentionOf(part.mention, self)}><Marked text={part.text} query={query} /></MentionLink>;
  })}</>;
};

export function LinkedMessageText({ text, large, mentionsAll }: { text: string; large?: boolean; mentionsAll?: boolean }) {
  const query = useSearchHighlight();
  const displayText = trimLineEnds(text);
  return <>{messageLinks(displayText).map((part, index) => part.href
    ? <MessageLink key={index} href={part.href}><Highlighted text={part.text} query={query} /></MessageLink>
    : <WithMentions key={index} text={part.text} query={query} large={large} mentionsAll={mentionsAll} />)}</>;
}
