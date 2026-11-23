export const MAX_PIN_SEGMENTS = 4;

export const activeSegment = (index: number, total: number) => {
  const segments = Math.min(total, MAX_PIN_SEGMENTS);
  if (total <= MAX_PIN_SEGMENTS) return index;
  return Math.round((index * (segments - 1)) / (total - 1));
};
