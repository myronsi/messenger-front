import { RefObject, useCallback, useEffect, useRef } from 'react';

const USER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
const MIN_DURATION_MS = 280;
const MAX_DURATION_MS = 800;
const DURATION_PER_DOUBLING_MS = 110;
const FRAME_MS = 1000 / 60;
const PEAK_SPEED = Math.PI / 2;
const MAX_STEP_SHARE = 0.4;
const MAX_FRAME_ADVANCE_MS = FRAME_MS * 1.25;

export const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const maxScrollTop = (container: HTMLElement) => Math.max(0, container.scrollHeight - container.clientHeight);

export const clampScrollTop = (container: HTMLElement, top: number) => Math.min(Math.max(top, 0), maxScrollTop(container));

export const scrollDuration = (distance: number, viewport: number) => {
  const screens = Math.abs(distance) / Math.max(viewport, 1);
  const calm = MIN_DURATION_MS + DURATION_PER_DOUBLING_MS * Math.log2(1 + screens);
  const overlapping = (PEAK_SPEED * FRAME_MS * screens) / MAX_STEP_SHARE;
  return Math.min(MAX_DURATION_MS, Math.max(calm, overlapping));
};

export const maxGlideDistance = (viewport: number) => (MAX_DURATION_MS * MAX_STEP_SHARE * viewport) / (PEAK_SPEED * FRAME_MS);

export const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

export type ScrollTarget = () => number | null;

export const animateScroll = (container: HTMLElement, getTarget: ScrollTarget, onEnd?: (completed: boolean) => void) => {
  const first = getTarget();
  let frame = 0;
  let ended = false;
  const end = (completed: boolean) => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(frame);
    USER_INPUT.forEach((name) => container.removeEventListener(name, cancel));
    onEnd?.(completed);
  };
  function cancel() { end(false); }
  if (first === null || prefersReducedMotion()) {
    if (first !== null) container.scrollTop = clampScrollTop(container, first);
    end(first !== null);
    return cancel;
  }
  const distance = clampScrollTop(container, first) - container.scrollTop;
  const limit = maxGlideDistance(container.clientHeight);
  if (Math.abs(distance) > limit) container.scrollTop = clampScrollTop(container, first) - Math.sign(distance) * limit;
  const duration = scrollDuration(Math.min(Math.abs(distance), limit), container.clientHeight);
  let lastTime = -1;
  let elapsed = 0;
  let progress = 0;
  const step = (time: number) => {
    if (ended) return;
    const target = getTarget();
    if (target === null) {
      end(false);
      return;
    }
    const goal = clampScrollTop(container, target);
    const now = time > 0 ? time : performance.now();
    elapsed += lastTime < 0 ? FRAME_MS : Math.min(Math.max(now - lastTime, 0), MAX_FRAME_ADVANCE_MS);
    lastTime = now;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutSine(t);
    const share = t >= 1 ? 1 : (eased - progress) / (1 - progress);
    progress = eased;
    const current = container.scrollTop;
    container.scrollTop = current + (goal - current) * share;
    if (t >= 1) end(true);
    else frame = requestAnimationFrame(step);
  };
  USER_INPUT.forEach((name) => container.addEventListener(name, cancel, { passive: true }));
  frame = requestAnimationFrame(step);
  return cancel;
};

export const useScrollAnimation = (chatContainerRef: RefObject<HTMLDivElement | null>, onLayoutChange: () => void) => {
  const isAnimatingRef = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const runRef = useRef<object | null>(null);

  const stopAnimation = useCallback(() => cancelRef.current?.(), []);

  const startAnimation = useCallback((getTarget: ScrollTarget, onDone?: () => void) => {
    const container = chatContainerRef.current;
    if (!container) return;
    cancelRef.current?.();
    const run = {};
    runRef.current = run;
    isAnimatingRef.current = true;
    container.toggleAttribute('data-gliding', true);
    onLayoutChange();
    const cancel = animateScroll(container, getTarget, (completed) => {
      if (runRef.current !== run) return;
      runRef.current = null;
      cancelRef.current = null;
      isAnimatingRef.current = false;
      container.toggleAttribute('data-gliding', false);
      if (completed) onDone?.();
    });
    if (runRef.current === run) cancelRef.current = cancel;
  }, [chatContainerRef, onLayoutChange]);

  useEffect(() => stopAnimation, [stopAnimation]);

  return { startAnimation, stopAnimation, isAnimatingRef };
};
