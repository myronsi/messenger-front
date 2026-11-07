export const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).split('=', 1)[0].replace(/\+/g, '-').replace(/\//g, '_');
};

export const fromBase64Url = (value: string) => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('Invalid base64url value');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const utf8 = (value: string) => new TextEncoder().encode(value);

export const sha256 = async (data: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', data.slice()));

export const P256_PUBLIC_KEY_BYTES = 65;

export const decodeIdentityKey = (value: string) => {
  const raw = fromBase64Url(value);
  if (raw.length !== P256_PUBLIC_KEY_BYTES || raw[0] !== 0x04) throw new Error('Invalid call identity key');
  return raw;
};
