import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/utils';

export const WHEEL_ITEM_PX = 40;
const SETTLE_MS = 90;
const PAD = WHEEL_ITEM_PX * 2;

export interface WheelItem<T> {
  value: T;
  label: string;
}

interface WheelColumnProps<T> {
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function WheelColumn<T extends string | number | null>({ items, value, onChange, label, className }: WheelColumnProps<T>) {
  const list = useRef<HTMLUListElement>(null);
  const settle = useRef<number | null>(null);
  const [smooth, setSmooth] = useState(false);
  const index = Math.max(0, items.findIndex((item) => item.value === value));

  useEffect(() => {
    const element = list.current;
    if (element && Math.round(element.scrollTop / WHEEL_ITEM_PX) !== index) element.scrollTop = index * WHEEL_ITEM_PX;
  }, [index, items.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSmooth(true));
    return () => {
      cancelAnimationFrame(frame);
      if (settle.current !== null) window.clearTimeout(settle.current);
    };
  }, []);

  const pick = (next: number) => {
    const item = items[Math.min(items.length - 1, Math.max(0, next))];
    if (item && item.value !== value) onChange(item.value);
  };

  const onScroll = () => {
    if (settle.current !== null) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      settle.current = null;
      const element = list.current;
      if (element) pick(Math.round(element.scrollTop / WHEEL_ITEM_PX));
    }, SETTLE_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[event.key];
    if (step) pick(index + step);
    else if (event.key === 'Home') pick(0);
    else if (event.key === 'End') pick(items.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-muted" />
      <ul ref={list} role="listbox" aria-label={label} tabIndex={0} data-vaul-no-drag="" onScroll={onScroll} onKeyDown={onKeyDown}
        aria-activedescendant={undefined}
        className={cn('relative h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg outline-none [scrollbar-width:none]',
          'focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-scrollbar]:hidden', smooth && 'scroll-smooth')}
        style={{ paddingBlock: PAD, maskImage: 'linear-gradient(transparent, #000 30%, #000 70%, transparent)' }}>
        {items.map((item, position) => (
          <li key={String(item.value)} role="option" aria-selected={position === index} onClick={() => pick(position)}
            className={cn('flex h-10 cursor-pointer snap-center items-center justify-center truncate px-2 text-base tabular-nums transition-colors',
              position === index ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
