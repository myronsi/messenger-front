const HEADER_BYTES = 21;

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

export const isAnimatedWebPHeader = (bytes: Uint8Array) => (
  bytes.length >= HEADER_BYTES && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP'
  && ascii(bytes, 12, 16) === 'VP8X' && (bytes[20] & 0x02) !== 0
);

export const isAnimatedWebP = async (file: Blob) => {
  try {
    return isAnimatedWebPHeader(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()));
  } catch {
    return false;
  }
};
