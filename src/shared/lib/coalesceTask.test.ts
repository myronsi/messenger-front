import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coalesceTask } from './coalesceTask';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('coalesceTask', () => {
  it('runs a burst of requests once after the delay', async () => {
    const task = vi.fn();
    const { schedule } = coalesceTask(task, 500);
    schedule(); schedule(); schedule();
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('keeps one run in flight and runs once more for requests that arrived meanwhile', async () => {
    let finish!: () => void;
    const task = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { schedule } = coalesceTask(task, 500);
    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule(); schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(500);
    expect(task).toHaveBeenCalledTimes(2);
    finish();
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('does not wait forever under a steady stream of events', async () => {
    const task = vi.fn();
    const { schedule } = coalesceTask(task, 500);
    for (let i = 0; i < 6; i += 1) {
      schedule();
      await vi.advanceTimersByTimeAsync(200);
    }
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps working after a failed run and stops once cancelled', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('offline'));
    const { schedule, cancel } = coalesceTask(task, 500);
    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule();
    await vi.advanceTimersByTimeAsync(500);
    expect(task).toHaveBeenCalledTimes(2);
    schedule();
    cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
