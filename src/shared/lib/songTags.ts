import { trimEndChars } from './trimChars';

export interface SongTags {
  title?: string;
  artist?: string;
  cover?: Blob;
}

const HEAD_BYTES = 2 * 1024 * 1024;

const clean = (value: string) => trimEndChars(value, '\0').replace(/\0/g, ' / ').trim() || undefined;

const decodeText = (bytes: Uint8Array, encoding: number) => {
  if (encoding === 1 || encoding === 2) {
    let label = 'utf-16be';
    let body = bytes;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) { label = 'utf-16le'; body = bytes.subarray(2); }
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) body = bytes.subarray(2);
    return new TextDecoder(label).decode(body);
  }
  return new TextDecoder(encoding === 3 ? 'utf-8' : 'latin1').decode(bytes);
};

const terminatorEnd = (bytes: Uint8Array, from: number, wide: boolean) => {
  for (let index = from; index < bytes.length; index += wide ? 2 : 1) {
    if (bytes[index] === 0 && (!wide || bytes[index + 1] === 0)) return index;
  }
  return bytes.length;
};

const synchsafe = (bytes: Uint8Array, at: number) => (
  ((bytes[at] & 0x7f) << 21) | ((bytes[at + 1] & 0x7f) << 14) | ((bytes[at + 2] & 0x7f) << 7) | (bytes[at + 3] & 0x7f)
);
const uint32 = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
const uint24 = (bytes: Uint8Array, at: number) => (bytes[at] << 16) + (bytes[at + 1] << 8) + bytes[at + 2];
const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

const readId3Picture = (body: Uint8Array, v22: boolean): Blob | undefined => {
  const encoding = body[0];
  const mimeEnd = v22 ? 4 : terminatorEnd(body, 1, false);
  const format = ascii(body, 1, 3).toLowerCase();
  const mime = v22 ? (format === 'png' ? 'image/png' : 'image/jpeg') : ascii(body, 1, mimeEnd - 1) || 'image/jpeg';
  const typeAt = v22 ? 4 : mimeEnd + 1;
  const wide = encoding === 1 || encoding === 2;
  const dataAt = terminatorEnd(body, typeAt + 1, wide) + (wide ? 2 : 1);
  if (dataAt >= body.length) return undefined;
  return new Blob([body.slice(dataAt)], { type: mime.includes('/') ? mime : `image/${mime}` });
};

export const readId3 = (bytes: Uint8Array): SongTags | null => {
  if (ascii(bytes, 0, 3) !== 'ID3') return null;
  const version = bytes[3];
  const flags = bytes[5];
  const end = Math.min(bytes.length, 10 + synchsafe(bytes, 6));
  const v22 = version === 2;
  let at = 10;
  if (!v22 && flags & 0x40) at += version === 4 ? synchsafe(bytes, at) : uint32(bytes, at) + 4;
  const tags: SongTags = {};
  const idLength = v22 ? 3 : 4;
  const headerLength = v22 ? 6 : 10;
  while (at + headerLength <= end) {
    const id = ascii(bytes, at, idLength);
    if (!/^[A-Z0-9]+$/.test(id)) break;
    const size = v22 ? uint24(bytes, at + 3) : version === 4 ? synchsafe(bytes, at + 4) : uint32(bytes, at + 4);
    const body = bytes.subarray(at + headerLength, Math.min(end, at + headerLength + size));
    if (id === 'TIT2' || id === 'TT2') tags.title ??= clean(decodeText(body.subarray(1), body[0]));
    else if (id === 'TPE1' || id === 'TP1') tags.artist ??= clean(decodeText(body.subarray(1), body[0]));
    else if ((id === 'APIC' || id === 'PIC') && !tags.cover) tags.cover = readId3Picture(body, v22);
    at += headerLength + size;
  }
  return tags;
};

export const readFlac = (bytes: Uint8Array): SongTags | null => {
  if (ascii(bytes, 0, 4) !== 'fLaC') return null;
  const tags: SongTags = {};
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 4;
  let last = false;
  while (!last && at + 4 <= bytes.length) {
    last = (bytes[at] & 0x80) !== 0;
    const type = bytes[at] & 0x7f;
    const length = uint24(bytes, at + 1);
    const start = at + 4;
    if (type === 4) {
      let cursor = start + 4 + view.getUint32(start, true);
      const count = view.getUint32(cursor, true);
      cursor += 4;
      for (let index = 0; index < count && cursor + 4 <= start + length; index += 1) {
        const size = view.getUint32(cursor, true);
        const comment = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 4, cursor + 4 + size));
        const split = comment.indexOf('=');
        const key = comment.slice(0, split).toUpperCase();
        if (key === 'TITLE') tags.title ??= clean(comment.slice(split + 1));
        if (key === 'ARTIST') tags.artist ??= clean(comment.slice(split + 1));
        cursor += 4 + size;
      }
    } else if (type === 6 && !tags.cover) {
      let cursor = start + 4;
      const mimeLength = uint32(bytes, cursor);
      const mime = ascii(bytes, cursor + 4, mimeLength);
      cursor += 4 + mimeLength;
      cursor += 4 + uint32(bytes, cursor) + 16;
      const size = uint32(bytes, cursor);
      tags.cover = new Blob([bytes.slice(cursor + 4, cursor + 4 + size)], { type: mime || 'image/jpeg' });
    }
    at = start + length;
  }
  return tags;
};

export const id3Length = (bytes: Uint8Array) => (
  bytes.length >= 10 && ascii(bytes, 0, 3) === 'ID3' ? 10 + synchsafe(bytes, 6) + (bytes[5] & 0x10 ? 10 : 0) : null
);

export const flacMetadataLength = (bytes: Uint8Array) => {
  if (bytes.length < 4 || ascii(bytes, 0, 4) !== 'fLaC') return null;
  let at = 4;
  while (at + 4 <= bytes.length) {
    const last = (bytes[at] & 0x80) !== 0;
    at += 4 + uint24(bytes, at + 1);
    if (last) return at;
  }
  return at + 4;
};

export const mp4Box = (bytes: Uint8Array) => {
  if (bytes.length < 8) return null;
  const size = uint32(bytes, 0);
  const large = size === 1 && bytes.length >= 16 ? uint32(bytes, 8) * 2 ** 32 + uint32(bytes, 12) : size;
  return { type: ascii(bytes, 4, 4), size: large };
};

const MP4_CONTAINERS = new Set(['moov', 'udta', 'meta', 'ilst']);

export const readMp4 = (bytes: Uint8Array): SongTags | null => (ascii(bytes, 4, 4) === 'ftyp' ? readMp4Boxes(bytes) : null);

export const readMp4Boxes = (bytes: Uint8Array): SongTags => {
  const tags: SongTags = {};
  const walk = (from: number, to: number) => {
    let at = from;
    while (at + 8 <= to) {
      const size = uint32(bytes, at);
      const type = ascii(bytes, at + 4, 4);
      const end = size < 8 ? to : Math.min(to, at + size);
      if (MP4_CONTAINERS.has(type)) walk(at + 8 + (type === 'meta' ? 4 : 0), end);
      else if (type === '©nam' || type === '©ART' || type === 'covr') {
        const dataAt = at + 8;
        if (ascii(bytes, dataAt + 4, 4) === 'data') {
          const kind = uint32(bytes, dataAt + 8) & 0xffffff;
          const payload = bytes.subarray(dataAt + 16, Math.min(end, dataAt + uint32(bytes, dataAt)));
          if (type === 'covr') tags.cover ??= new Blob([payload.slice()], { type: kind === 14 ? 'image/png' : 'image/jpeg' });
          else if (type === '©nam') tags.title ??= clean(new TextDecoder('utf-8').decode(payload));
          else tags.artist ??= clean(new TextDecoder('utf-8').decode(payload));
        }
      }
      at = end;
    }
  };
  walk(0, bytes.length);
  return tags;
};

export const readSongTags = async (file: Blob): Promise<SongTags> => {
  try {
    const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
    const fromHead = readId3(head) ?? readFlac(head);
    if (fromHead) return fromHead;
    if (ascii(head, 4, 4) !== 'ftyp') return {};
    return readMp4(new Uint8Array(await file.arrayBuffer())) ?? {};
  } catch {
    return {};
  }
};

export const songTitleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
