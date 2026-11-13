import { describe, expect, it, vi } from 'vitest';
import { withStoredFallback } from './offlineStore';

describe('withStoredFallback', () => {
  it('returns fresh data when the request works', async () => {
    const read = vi.fn();
    await expect(withStoredFallback('k', async () => 'fresh', read)).resolves.toBe('fresh');
    expect(read).not.toHaveBeenCalled();
  });

  it('returns the stored value when the network fails', async () => {
    const read = vi.fn(async () => 'stored');
    await expect(withStoredFallback('k', async () => { throw new TypeError('Failed to fetch'); }, read)).resolves.toBe('stored');
    expect(read).toHaveBeenCalledWith('k');
  });

  it('keeps the error when nothing is stored or the server says the data is gone', async () => {
    const offline = new TypeError('Failed to fetch');
    await expect(withStoredFallback('k', async () => { throw offline; }, async () => undefined)).rejects.toBe(offline);
    const read = vi.fn(async () => 'stored');
    const gone = { status: 404 };
    await expect(withStoredFallback('k', async () => { throw gone; }, read)).rejects.toBe(gone);
    expect(read).not.toHaveBeenCalled();
  });
});
