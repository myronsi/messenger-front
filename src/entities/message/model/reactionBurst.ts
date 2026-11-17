import { useSyncExternalStore } from 'react';
import { prefersReducedMotion } from './messageDeletion';

export const BURST_MS = 700;

export interface ReactionBurst {
  id: number;
  reaction: string;
  x: number;
  y: number;
}

export interface BurstPoint {
  x: number;
  y: number;
}

let bursts: ReactionBurst[] = [];
let sequence = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const burstReaction = (reaction: string, point: BurstPoint) => {
  if (prefersReducedMotion()) return;
  const burst = { id: ++sequence, reaction, x: point.x, y: point.y };
  bursts = [...bursts.slice(-5), burst];
  emit();
  window.setTimeout(() => {
    bursts = bursts.filter((item) => item.id !== burst.id);
    emit();
  }, BURST_MS);
};

export const elementCenter = (element: Element): BurstPoint => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const read = () => bursts;

export const useReactionBursts = () => useSyncExternalStore(subscribe, read, read);
