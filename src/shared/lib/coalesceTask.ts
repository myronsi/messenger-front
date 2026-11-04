export const coalesceTask = (task: () => unknown, delayMs: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let requestedWhileRunning = false;
  let cancelled = false;

  const run = async () => {
    timer = null;
    running = true;
    requestedWhileRunning = false;
    await Promise.resolve().then(task).catch(() => undefined);
    running = false;
    if (requestedWhileRunning) schedule();
  };

  const schedule = () => {
    if (cancelled) return;
    if (running) {
      requestedWhileRunning = true;
      return;
    }
    if (timer) return;
    timer = setTimeout(() => void run(), delayMs);
  };

  const cancel = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return { schedule, cancel };
};
