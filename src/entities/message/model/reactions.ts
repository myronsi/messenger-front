import type { ReactionInfo } from './types';

export const MAX_VISIBLE_REACTIONS = 5;

export interface ReactionGroup {
  reaction: string;
  count: number;
  users: ReactionInfo[];
  lastAddedIndex: number;
}

export const groupAndSortReactions = (reactions: ReactionInfo[] | null | undefined): ReactionGroup[] => {
  const groups = new Map<string, ReactionGroup>();

  (reactions ?? []).forEach((item, index) => {
    if (!item?.reaction) return;
    const existing = groups.get(item.reaction);
    if (existing) {
      existing.count += 1;
      existing.users.push(item);
      existing.lastAddedIndex = index;
    } else {
      groups.set(item.reaction, { reaction: item.reaction, count: 1, users: [item], lastAddedIndex: index });
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.count - a.count || b.lastAddedIndex - a.lastAddedIndex
  );
};

/** Splits sorted groups into the ones shown directly and the ones collapsed into the "+N" indicator. */
export const splitVisibleReactions = (groups: ReactionGroup[], maxVisible: number = MAX_VISIBLE_REACTIONS) => ({
  visible: groups.slice(0, maxVisible),
  hidden: groups.slice(maxVisible),
});
