import { useEffect, useState } from 'react';
import type { ReactionGroup } from './reactions';
import { prefersReducedMotion } from './messageDeletion';

export const LEAVE_MS = 200;

interface Leaving {
  group: ReactionGroup;
  index: number;
}

export interface ShownReaction {
  group: ReactionGroup;
  leaving: boolean;
}

export const useLeavingReactions = (visible: ReactionGroup[], hidden: ReactionGroup[]): ShownReaction[] => {
  const [previous, setPrevious] = useState(visible);
  const [leaving, setLeaving] = useState<Leaving[]>([]);

  if (previous !== visible) {
    const present = new Set([...visible, ...hidden].map((group) => group.reaction));
    const gone = prefersReducedMotion() ? [] : previous
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => !present.has(group.reaction));
    setPrevious(visible);
    setLeaving((current) => {
      const kept = current.filter((item) => !present.has(item.group.reaction));
      return [...kept, ...gone.filter((item) => !kept.some((other) => other.group.reaction === item.group.reaction))];
    });
  }

  useEffect(() => {
    if (leaving.length === 0) return undefined;
    const timer = window.setTimeout(() => setLeaving([]), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const shown: ShownReaction[] = visible.map((group) => ({ group, leaving: false }));
  leaving
    .filter((item) => !visible.some((group) => group.reaction === item.group.reaction))
    .forEach(({ group, index }) => shown.splice(Math.min(index, shown.length), 0, { group, leaving: true }));
  return shown;
};
