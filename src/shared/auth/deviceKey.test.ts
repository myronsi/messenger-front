import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adjustDeviceClock, createDeviceProof, forgetCachedDeviceKey, forgetDeviceKey, getOrCreateDeviceKey } from './deviceKey';

type Callback = (() => void) | null;

const memoryIndexedDb = () => {
  const databases = new Map<string, Map<string, Map<unknown, unknown>>>();
  const later = <T,>(produce: () => T) => {
    const request = { result: undefined as T | undefined, error: null, onsuccess: null as Callback, onerror: null as Callback };
    setTimeout(() => {
      request.result = produce();
      request.onsuccess?.();
    });
    return request;
  };
  const open = (name: string) => {
    const created = !databases.has(name);
    const stores = databases.get(name) ?? new Map<string, Map<unknown, unknown>>();
    databases.set(name, stores);
    const db = {
      objectStoreNames: { contains: (store: string) => stores.has(store) },
      createObjectStore: (store: string) => stores.set(store, new Map()),
      transaction: (store: string) => ({
        objectStore: () => {
          const rows = stores.get(store)!;
          return {
            get: (key: unknown) => later(() => rows.get(key)),
            put: (value: { id: unknown }) => later(() => { rows.set(value.id, value); return value.id; }),
            delete: (key: unknown) => later(() => { rows.delete(key); }),
          };
        },
      }),
      close: () => undefined,
    };
    const request = { result: db, error: null, onupgradeneeded: null as Callback, onsuccess: null as Callback, onerror: null as Callback };
    setTimeout(() => {
      if (created) request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  };
  return { open } as unknown as IDBFactory;
};

const decoder = new TextDecoder();

const fromBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const decodePart = (value: string) => JSON.parse(decoder.decode(fromBase64Url(value))) as Record<string, unknown>;

const parseProof = (proof: string | null) => {
  expect(proof).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  const [header, payload, signature] = proof!.split('.');
  return { header, payload, signature, protectedHeader: decodePart(header), claims: decodePart(payload) };
};

const verifies = async (proof: string) => {
  const { header, payload, signature, protectedHeader } = parseProof(proof);
  const publicKey = await crypto.subtle.importKey('jwk', protectedHeader.jwk as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64Url(signature), new TextEncoder().encode(`${header}.${payload}`));
};

describe('device key', () => {
  beforeEach(() => {
    forgetCachedDeviceKey();
    vi.stubGlobal('indexedDB', memoryIndexedDb());
  });

  afterEach(() => {
    adjustDeviceClock(new Date().toUTCString());
    forgetCachedDeviceKey();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  });

  it('signs a proof that verifies against the public key in its header', async () => {
    const proof = await createDeviceProof('post', 'https://api.test/api/v2/auth/refresh?next=1#top');
    expect(await verifies(proof!)).toBe(true);
    const { protectedHeader, claims, signature } = parseProof(proof);
    expect(protectedHeader).toEqual({ typ: 'dpop+jwt', alg: 'ES256', jwk: { kty: 'EC', crv: 'P-256', x: expect.any(String), y: expect.any(String) } });
    expect(Object.keys(protectedHeader.jwk as object).sort()).toEqual(['crv', 'kty', 'x', 'y']);
    expect(claims).toEqual({ htm: 'POST', htu: 'https://api.test/api/v2/auth/refresh', iat: expect.any(Number), jti: expect.any(String) });
    expect(Number.isInteger(claims.iat)).toBe(true);
    expect(Math.abs((claims.iat as number) - Date.now() / 1000)).toBeLessThan(5);
    expect(fromBase64Url(signature)).toHaveLength(64);
    expect(proof).not.toContain('=');
  });

  it('uses a fresh jti for every proof and keeps the same key', async () => {
    const first = parseProof(await createDeviceProof('POST', 'https://api.test/api/v2/auth/login'));
    const second = parseProof(await createDeviceProof('POST', 'https://api.test/api/v2/auth/login'));
    expect(first.claims.jti).not.toBe(second.claims.jti);
    expect(first.protectedHeader.jwk).toEqual(second.protectedHeader.jwk);
  });

  it('keeps a private key that cannot be exported and reloads it from IndexedDB', async () => {
    const keys = await getOrCreateDeviceKey();
    expect(keys?.privateKey.extractable).toBe(false);
    const before = parseProof(await createDeviceProof('POST', 'https://api.test/auth/refresh')).protectedHeader.jwk;
    forgetCachedDeviceKey();
    const after = parseProof(await createDeviceProof('POST', 'https://api.test/auth/refresh')).protectedHeader.jwk;
    expect(after).toEqual(before);
  });

  it('makes a new key after the old one was forgotten', async () => {
    const before = parseProof(await createDeviceProof('POST', 'https://api.test/auth/login')).protectedHeader.jwk;
    await forgetDeviceKey();
    const after = parseProof(await createDeviceProof('POST', 'https://api.test/auth/login')).protectedHeader.jwk;
    expect(after).not.toEqual(before);
  });

  it('does not keep using a key that a sign-out is deleting at the same time', async () => {
    const before = await createDeviceProof('POST', 'https://api.test/auth/login');
    const forgetting = forgetDeviceKey();
    const during = await createDeviceProof('POST', 'https://api.test/auth/login');
    await forgetting;
    forgetCachedDeviceKey();
    const after = await createDeviceProof('POST', 'https://api.test/auth/login');
    expect(parseProof(during).protectedHeader.jwk).not.toEqual(parseProof(before).protectedHeader.jwk);
    expect(parseProof(after).protectedHeader.jwk).toEqual(parseProof(during).protectedHeader.jwk);
  });

  it('creates the key under a lock shared by all tabs', async () => {
    const names: string[] = [];
    Object.defineProperty(navigator, 'locks', { configurable: true, value: {
      request: async (name: string, task: () => Promise<unknown>) => { names.push(name); return task(); },
    } });
    const [first, second] = await Promise.all([getOrCreateDeviceKey(), getOrCreateDeviceKey()]);
    expect(first).toBe(second);
    expect(names).toEqual(['device-key']);
  });

  it('dates the proof by the server clock after a correction', async () => {
    expect(adjustDeviceClock(new Date(Date.now() + 600_000).toUTCString())).toBe(true);
    const { claims } = parseProof(await createDeviceProof('POST', 'https://api.test/auth/refresh'));
    expect(Math.abs((claims.iat as number) - (Date.now() / 1000 + 600))).toBeLessThan(5);
    expect(adjustDeviceClock(null)).toBe(false);
    expect(adjustDeviceClock('not a date')).toBe(false);
  });

  it('sends no proof when IndexedDB is not available', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await getOrCreateDeviceKey()).toBeNull();
    expect(await createDeviceProof('POST', 'https://api.test/auth/login')).toBeNull();
  });
});
