import { useRef, type ReactNode } from 'react';
import { LinkedMessageText } from './LinkedMessageText';
import { useCompactMessageWidth } from './useCompactMessageWidth';

export function MessageTextBody({ text, trailing }: { text: string; trailing?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useCompactMessageWidth(ref, text, trailing);
  return <div ref={ref} data-message-text-body className="whitespace-pre-wrap"><LinkedMessageText text={text} />{trailing}</div>;
}
