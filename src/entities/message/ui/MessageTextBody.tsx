import { useRef, type ReactNode } from 'react';
import { LinkedMessageText } from './LinkedMessageText';
import { useCompactMessageWidth } from './useCompactMessageWidth';
import { isEmojiOnly } from '@/shared/lib/customEmoji';

export function MessageTextBody({ text, trailing }: { text: string; trailing?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useCompactMessageWidth(ref, text, trailing != null && trailing !== false);
  const large = isEmojiOnly(text);
  return (
    <div ref={ref} data-message-text-body data-emoji-only={large || undefined} className={large ? 'whitespace-pre-wrap text-4xl leading-tight' : 'whitespace-pre-wrap'}>
      <LinkedMessageText text={text} />{trailing}
    </div>
  );
}
