import { messageLinks } from '@/shared/lib/messageLinks';
import { MessageLink } from './MessageLink';

export function LinkedMessageText({ text }: { text: string }) {
  const displayText = text.replace(/[ \t]+(?=\r?$)/gm, '');
  return <>{messageLinks(displayText).map((part, index) => part.href
    ? <MessageLink key={index} href={part.href}>{part.text}</MessageLink> : part.text)}</>;
}
