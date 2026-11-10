import { publicWebOrigin } from '@/shared/lib/webOrigin';

export const moveItem = <T,>(items: readonly T[], index: number, step: -1 | 1): T[] => {
  const target = index + step;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const packLink = (slug: string, origin = publicWebOrigin()) => `${origin}/stickers/${slug}`;
