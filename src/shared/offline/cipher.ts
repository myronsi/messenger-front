export interface OfflineKeys {
  data: CryptoKey;
  search: CryptoKey;
}

export interface Sealed {
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlBytes = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const derive = (base: CryptoKey, info: string, algorithm: HmacImportParams | AesKeyGenParams, usages: KeyUsage[]) =>
  crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: encoder.encode(info) },
    base, algorithm, false, usages,
  );

export const deriveOfflineKeys = async (serverKey: string): Promise<OfflineKeys> => {
  const base = await crypto.subtle.importKey('raw', base64UrlBytes(serverKey), 'HKDF', false, ['deriveKey']);
  const [data, search] = await Promise.all([
    derive(base, 'messenger-offline-data', { name: 'AES-GCM', length: 256 }, ['encrypt', 'decrypt']),
    derive(base, 'messenger-offline-search', { name: 'HMAC', hash: 'SHA-256', length: 256 }, ['sign']),
  ]);
  return { data, search };
};

export const sealBytes = async (keys: OfflineKeys, bytes: BufferSource): Promise<Sealed> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv, data: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keys.data, bytes) };
};

export const openBytes = (keys: OfflineKeys, sealed: Sealed) =>
  crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, keys.data, sealed.data);

export const sealJson = (keys: OfflineKeys, value: unknown) => sealBytes(keys, encoder.encode(JSON.stringify(value)));

export const openJson = async <T>(keys: OfflineKeys, sealed: Sealed): Promise<T> =>
  JSON.parse(decoder.decode(await openBytes(keys, sealed))) as T;

export const searchToken = async (keys: OfflineKeys, word: string) => {
  const mac = await crypto.subtle.sign('HMAC', keys.search, encoder.encode(word));
  return [...new Uint8Array(mac, 0, 12)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
