import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadApp, resetReloadAppForTests } from './reloadApp';

class FakeWorker extends EventTarget {
  postMessage = vi.fn();
  constructor(public state: ServiceWorkerState) { super(); }
  moveTo(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

const reload = vi.fn();
const originalLocation = window.location;
let container: EventTarget & { getRegistrations: ReturnType<typeof vi.fn> };

const registration = (worker: { installing?: FakeWorker; waiting?: FakeWorker } = {}, update = vi.fn(() => Promise.resolve())) => ({
  installing: worker.installing ?? null,
  waiting: worker.waiting ?? null,
  update,
});

const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

beforeEach(() => {
  resetReloadAppForTests();
  reload.mockReset();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, reload } });
  container = Object.assign(new EventTarget(), { getRegistrations: vi.fn() });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('reloadApp', () => {
  it('reloads at once when there is no service worker', async () => {
    container.getRegistrations.mockResolvedValue([]);
    await reloadApp();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('waits until the new build is active before reloading', async () => {
    const worker = new FakeWorker('installing');
    container.getRegistrations.mockResolvedValue([registration({ installing: worker })]);
    const done = reloadApp();
    await flush();
    expect(reload).not.toHaveBeenCalled();
    worker.moveTo('installed');
    expect(reload).not.toHaveBeenCalled();
    worker.moveTo('activated');
    await done;
    expect(reload).toHaveBeenCalledOnce();
  });

  it('asks a waiting worker to take over', async () => {
    const worker = new FakeWorker('installed');
    container.getRegistrations.mockResolvedValue([registration({ waiting: worker })]);
    const done = reloadApp();
    await flush();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    container.dispatchEvent(new Event('controllerchange'));
    await done;
    expect(reload).toHaveBeenCalledOnce();
  });

  it('runs only once when the button is pressed again', async () => {
    const worker = new FakeWorker('installing');
    container.getRegistrations.mockResolvedValue([registration({ installing: worker })]);
    const first = reloadApp();
    const second = reloadApp();
    expect(second).toBe(first);
    await flush();
    worker.moveTo('activated');
    await Promise.all([first, second]);
    expect(container.getRegistrations).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('still reloads when the update check fails', async () => {
    container.getRegistrations.mockResolvedValue([registration({}, vi.fn(() => Promise.reject(new Error('offline'))))]);
    await reloadApp();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads after a time limit when the new worker never takes over', async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker('installing');
    container.getRegistrations.mockResolvedValue([registration({ installing: worker })]);
    const done = reloadApp();
    await vi.advanceTimersByTimeAsync(19_000);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    await done;
    expect(reload).toHaveBeenCalledOnce();
  });
});
