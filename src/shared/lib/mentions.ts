export type MentionPart = { text: string; mention?: string };

export const MENTION_ALL = 'all';
const MENTION = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,32})(?![A-Za-z0-9_])/g;

export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MENTION)) {
    const start = match.index + match[1].length;
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: `@${match[2]}`, mention: match[2] });
    cursor = start + match[2].length + 1;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export const mentionedNames = (text: string) => [...new Set(splitMentions(text).flatMap((part) => (part.mention ? [part.mention.toLowerCase()] : [])))];

export const isMentionOf = (name: string, username: string) => !!username && name.toLowerCase() === username.toLowerCase();
