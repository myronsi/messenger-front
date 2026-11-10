import { describe, expect, it } from 'vitest';
import { createUploadQueue } from './uploadQueue';

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

describe('createUploadQueue', () => {
  it('starts the first upload at once and the next one after it', async () => {
    const enqueue = createUploadQueue();
    const started: string[] = [];
    const first = deferred();
    const one = enqueue(() => { started.push('album'); return first.promise; });
    const two = enqueue(async () => { started.push('file'); });
    expect(started).toEqual(['album']);
    first.resolve();
    await Promise.all([one, two]);
    expect(started).toEqual(['album', 'file']);
  });

  it('keeps going after a failed upload', async () => {
    const enqueue = createUploadQueue();
    const failed = deferred();
    const one = enqueue(() => failed.promise);
    let ran = false;
    const two = enqueue(async () => { ran = true; });
    failed.reject(new Error('offline'));
    await expect(one).rejects.toThrow('offline');
    await two;
    expect(ran).toBe(true);
  });
});
