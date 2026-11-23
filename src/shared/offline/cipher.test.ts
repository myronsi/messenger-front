import { describe, expect, it } from 'vitest';
import { deriveOfflineKeys, openJson, sealJson, searchToken } from './cipher';

const serverKey = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const otherKey = 'HxwdHhsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA';

describe('offline cipher', () => {
  it('opens what it sealed and nothing sealed with another key', async () => {
    const keys = await deriveOfflineKeys(serverKey);
    const sealed = await sealJson(keys, { id: '7', content: 'hello' });
    expect(new TextDecoder().decode(sealed.data)).not.toContain('hello');
    await expect(openJson(keys, sealed)).resolves.toEqual({ id: '7', content: 'hello' });
    await expect(openJson(await deriveOfflineKeys(otherKey), sealed)).rejects.toThrow();
  });

  it('keeps the keys locked and hashes search words per key', async () => {
    const keys = await deriveOfflineKeys(serverKey);
    expect(keys.data.extractable).toBe(false);
    expect(keys.search.extractable).toBe(false);
    const token = await searchToken(keys, 'hello');
    expect(token).toMatch(/^[0-9a-f]{24}$/);
    expect(await searchToken(keys, 'hello')).toBe(token);
    expect(await searchToken(await deriveOfflineKeys(otherKey), 'hello')).not.toBe(token);
  });
});
