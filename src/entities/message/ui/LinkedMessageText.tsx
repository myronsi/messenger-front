import { messageLinks } from '@/shared/lib/messageLinks';
import { splitByQuery, useSearchHighlight } from '@/shared/lib/searchHighlight';
import { MessageLink } from './MessageLink';
import { splitEmoji } from '@/shared/lib/customEmoji';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';

const Marked = ({ text, query }: { text: string; query: string }) => (
  <>{splitByQuery(text, query).map((part, index) => part.match
    ? <mark key={index} data-search-match className="rounded-sm bg-highlight text-inherit">{part.text}</mark> : part.text)}</>
);

const Highlighted = ({ text, query }: { text: string; query: string }) => (
  <>{splitEmoji(text).map((part, index) => (part.kind === 'text'
    ? <Marked key={index} text={part.text} query={query} />
    : <CustomEmoji key={index} id={part.token.id} shortcode={part.token.shortcode} />))}</>
);

export function LinkedMessageText({ text }: { text: string }) {
  const query = useSearchHighlight();
  const displayText = text.replace(/[ \t]+(?=\r?$)/gm, '');
  return <>{messageLinks(displayText).map((part, index) => part.href
    ? <MessageLink key={index} href={part.href}><Highlighted text={part.text} query={query} /></MessageLink>
    : <Highlighted key={index} text={part.text} query={query} />)}</>;
}
