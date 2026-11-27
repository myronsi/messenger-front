export const IMPORT_TIMINGS_FLAG = 'debug:import';

const flagged = () => {
  try {
    return globalThis.localStorage?.getItem(IMPORT_TIMINGS_FLAG) === '1';
  } catch {
    return false;
  }
};

export const importTimer = (enabled = flagged()) => async <T>(name: string, run: () => Promise<T>): Promise<T> => {
  if (!enabled || typeof performance === 'undefined') return run();
  const start = performance.now();
  try {
    return await run();
  } finally {
    performance.measure(`import:${name}`, { start, end: performance.now() });
  }
};
