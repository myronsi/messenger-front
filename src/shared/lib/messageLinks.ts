export type MessageTextPart = { text: string; href?: string };

export function messageLinks(text: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"]+/gi)) {
    const start = match.index;
    let url = match[0].replace(/[.,!?;:'\u2019\u201d]+$/, '');
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (url.endsWith(close) && url.split(close).length > url.split(open).length) url = url.slice(0, -1);
    }
    try {
      if ([...url].some(character => character.charCodeAt(0) < 32)) continue;
      const parsed = new URL(url);
      if (!parsed.hostname || !['http:', 'https:'].includes(parsed.protocol)) continue;
    } catch { continue; }
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: url, href: url });
    cursor = start + url.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
