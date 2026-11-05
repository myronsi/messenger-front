let sequence = 0;

// Monotonic local IDs also distinguish two sends in the same millisecond.
export const createTempMessageId = () => {
  sequence = Math.max(sequence + 1, Date.now());
  return -sequence;
};
