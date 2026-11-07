import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireMediaOwnership, isMediaOwnedElsewhere, waitForMediaRelease } from './tabOwnership';

type Grant = (lock: { name: string } | null) => unknown;
type Pending = { grant: Grant; signal?: AbortSignal; resolve: (value: unknown) => void; reject: (error: unknown) => void };

const fakeLocks = () => {
  let held = false;
  const queue: Pending[] = [];
  const run = (entry: Pending) => {
    held = true;
    Promise.resolve(entry.grant({ name: 'messenger-call-media' })).then((value) => {
      held = false;
      entry.resolve(value);
      const next = queue.shift();
      if (next) run(next);
    });
  };
  return {
    request: vi.fn((_name: string, options: { ifAvailable?: boolean; signal?: AbortSignal }, grant: Grant) => new Promise((resolve, reject) => {
      const entry = { grant, signal: options.signal, resolve, reject };
      if (!held) { run(entry); return; }
      if (options.ifAvailable) { Promise.resolve(grant(null)).then(resolve); return; }
      options.signal?.addEventListener('abort', () => {
        const index = queue.indexOf(entry);
        if (index >= 0) { queue.splice(index, 1); reject(new DOMException('Aborted', 'AbortError')); }
      });
      queue.push(entry);
    })),
    query: async () => ({ held: held ? [{ name: 'messenger-call-media' }] : [] }),
  };
};

const settle = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); };

describe('media ownership across tabs', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: fakeLocks() });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('notices when the owning tab releases the lock without announcing it', async () => {
    const owner = await acquireMediaOwnership();
    expect(await isMediaOwnedElsewhere(false)).toBe(true);
    const released = vi.fn();
    waitForMediaRelease(released);
    await settle();
    expect(released).not.toHaveBeenCalled();
    owner?.release();
    await settle();
    expect(released).toHaveBeenCalledTimes(1);
    expect(await isMediaOwnedElsewhere(false)).toBe(false);
    expect(await acquireMediaOwnership()).not.toBeNull();
  });

  it('withdraws the waiting request when the wait is cancelled', async () => {
    const owner = await acquireMediaOwnership();
    const released = vi.fn();
    const cancel = waitForMediaRelease(released);
    cancel();
    owner?.release();
    await settle();
    expect(released).not.toHaveBeenCalled();
    expect(await isMediaOwnedElsewhere(false)).toBe(false);
  });

  it('does nothing without the Web Locks API', () => {
    Reflect.deleteProperty(navigator, 'locks');
    const released = vi.fn();
    expect(() => waitForMediaRelease(released)()).not.toThrow();
    expect(released).not.toHaveBeenCalled();
  });
});
