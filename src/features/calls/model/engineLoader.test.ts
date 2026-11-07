import { describe, expect, it, vi } from 'vitest';
import { createEngineLoader } from './engineLoader';

describe('engine loader', () => {
  it('loads the engine chunk once and tries again after a failed import', async () => {
    const importer = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('stale chunk')).mockResolvedValue('engine');
    const load = createEngineLoader(importer);
    await expect(load()).rejects.toThrow('stale chunk');
    await expect(load()).resolves.toBe('engine');
    await expect(load()).resolves.toBe('engine');
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
