import { messageLinks } from '@/shared/lib/messageLinks';
import { splitByQuery, useSearchHighlight } from '@/shared/lib/searchHighlight';
import { MessageLink } from './MessageLink';

const Highlighted = ({ text, query }: { text: string; query: string }) => (
  <>{splitByQuery(text, query).map((part, index) => part.match
    ? <mark key={index} data-search-match className="rounded-sm bg-highlight text-inherit">{part.text}</mark> : part.text)}</>
);

export function LinkedMessageText({ text }: { text: string }) {
  const query = useSearchHighlight();
  const displayText = text.replace(/[ \t]+(?=\r?$)/gm, '');
  return <>{messageLinks(displayText).map((part, index) => part.href
    ? <MessageLink key={index} href={part.href}><Highlighted text={part.text} query={query} /></MessageLink>
    : <Highlighted key={index} text={part.text} query={query} />)}</>;
}
