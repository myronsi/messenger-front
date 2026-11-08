import { useLayoutEffect, useRef, useState } from 'react';

type Box = { x: number; y: number; width: number; height: number };
const box = (element: HTMLElement): Box => ({ x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight });

export function ProfileTabHighlight({ active, layoutKey = '' }: { active: string; layoutKey?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [frames, setFrames] = useState<{ current: Box; previous: Box; next: Box } | null>(null);
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const buttons = [...parent.querySelectorAll<HTMLElement>('[data-profile-tab]')];
      const index = buttons.findIndex(button => button.dataset.profileTab === active);
      if (index < 0) { setFrames(null); return; }
      const current = box(buttons[index]);
      setFrames({ current, previous: box(buttons[index - 1] || buttons[index]), next: box(buttons[index + 1] || buttons[index]) });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(parent);
    parent.querySelectorAll<HTMLElement>('[data-profile-tab]').forEach(button => observer?.observe(button));
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [active, layoutKey]);
  const interpolate = (key: keyof Box) => !frames ? '0px'
    : `calc(${frames.current[key]}px + var(--profile-swipe-next, 0) * ${frames.next[key] - frames.current[key]}px + var(--profile-swipe-previous, 0) * ${frames.previous[key] - frames.current[key]}px)`;
  return <span ref={ref} aria-hidden="true" data-testid="profile-tab-highlight"
    className="pointer-events-none absolute left-0 top-0 -z-10 rounded-md bg-muted motion-reduce:!transition-none"
    style={{ visibility: frames ? 'visible' : 'hidden', width: interpolate('width'), height: interpolate('height'),
      transform: `translate(${interpolate('x')}, ${interpolate('y')})`,
      transition: 'var(--profile-swipe-transition, transform 200ms ease-out, width 200ms ease-out, height 200ms ease-out)' }} />;
}
