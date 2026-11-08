import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  bubbleMorph, CALL_VIEW_EASE, CALL_VIEW_MOTION_MS, dragAsMorphStart, minimizeCall, type CallCorner, type CallViewDrag, type CallViewMode,
} from '../model/callView';
import { useSwipeToMinimize } from './useSwipeToMinimize';

type Shown = CallViewMode | 'none';

const canAnimate = (element: HTMLElement | null): element is HTMLElement => (
  !!element && typeof element.animate === 'function' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

const morphFrames = (element: HTMLElement, corner: CallCorner, drag: CallViewDrag | null = null) => {
  element.style.transform = '';
  element.style.transformOrigin = '';
  const rect = element.getBoundingClientRect();
  const { origin, originX, originY, scale } = bubbleMorph(rect, corner, window.innerWidth, window.innerHeight);
  const from = drag ? dragAsMorphStart(drag, rect.width, originX, originY) : 'translate(0px, 0px) scale(1)';
  return [
    { transformOrigin: origin, transform: from, opacity: 1, borderRadius: '0px' },
    { transformOrigin: origin, transform: `translate(0px, 0px) scale(${scale})`, opacity: 0, borderRadius: '50%' },
  ];
};

export const useCallViewMotion = (inCall: boolean, mode: CallViewMode, corner: CallCorner) => {
  const shown: Shown = inCall ? mode : 'none';
  const [fullMounted, setFullMounted] = useState(shown === 'full');
  const element = useRef<HTMLDivElement | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const drag = useRef<CallViewDrag | null>(null);
  const previous = useRef<Shown>(shown);
  const cornerRef = useRef(corner);
  cornerRef.current = corner;

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = shown;
    if (shown === 'full') {
      setFullMounted(true);
      return undefined;
    }
    const target = element.current;
    if (shown === 'none' || before !== 'full' || !canAnimate(target)) {
      setFullMounted(false);
      return undefined;
    }
    const frames = morphFrames(target, cornerRef.current, drag.current);
    drag.current = null;
    const animation = target.animate(frames, { duration: CALL_VIEW_MOTION_MS, easing: CALL_VIEW_EASE, fill: 'forwards' });
    animation.onfinish = () => setFullMounted(false);
    return () => animation.cancel();
  }, [shown]);

  const attachFull = useCallback((node: HTMLDivElement | null) => {
    element.current = node;
    setNode(node);
    if (!canAnimate(node)) return;
    const frames = previous.current === 'mini'
      ? morphFrames(node, cornerRef.current).reverse()
      : [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }];
    node.animate(frames, { duration: CALL_VIEW_MOTION_MS, easing: CALL_VIEW_EASE });
  }, []);

  useSwipeToMinimize(node, (released) => {
    drag.current = released;
    minimizeCall();
  });

  return { fullMounted: fullMounted || shown === 'full', closing: fullMounted && shown !== 'full', attachFull };
};
