import { flacMetadataLength, id3Length, mp4Box, readFlac, readId3, readMp4Boxes, readSongTags, type SongTags } from './songTags';

const PROBE_BYTES = 16 * 1024;
const MAX_TAG_BYTES = 4 * 1024 * 1024;
const MAX_ROUNDS = 4;
const MAX_BOXES = 8;

const joined = (head: Uint8Array, tail: Uint8Array) => {
  const out = new Uint8Array(head.length + tail.length);
  out.set(head);
  out.set(tail, head.length);
  return out;
};

export const readRange = async (source: string, start: number, length: number): Promise<Uint8Array | null> => {
  const response = await fetch(source, { headers: { Range: `bytes=${start}-${start + length - 1}` } });
  if (!response.ok || !response.body) return null;
  if (response.status !== 206 && start > 0) {
    void response.body.cancel().catch(() => undefined);
    return null;
  }
  const reader = response.body.getReader();
  const bytes = new Uint8Array(length);
  let size = 0;
  while (size < length) {
    const { done, value } = await reader.read();
    if (done) break;
    const part = value.subarray(0, length - size);
    bytes.set(part, size);
    size += part.length;
  }
  void reader.cancel().catch(() => undefined);
  return bytes.subarray(0, size);
};

const readMp4Tags = async (source: string) => {
  let at = 0;
  for (let hop = 0; hop < MAX_BOXES; hop += 1) {
    const header = await readRange(source, at, 16);
    const box = header && mp4Box(header);
    if (!box || box.size < 8) return {};
    if (box.type === 'moov') {
      const moov = box.size <= MAX_TAG_BYTES ? await readRange(source, at, box.size) : null;
      return moov ? readMp4Boxes(moov) : {};
    }
    at += box.size;
  }
  return {};
};

const readHeadTags = async (source: string, head: Uint8Array) => {
  let bytes = head;
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const need = id3Length(bytes) ?? flacMetadataLength(bytes);
    if (need === null || need <= bytes.length || need > MAX_TAG_BYTES) break;
    const more = await readRange(source, bytes.length, Math.max(need - bytes.length, PROBE_BYTES));
    if (!more?.length) break;
    bytes = joined(bytes, more);
  }
  return readId3(bytes) ?? readFlac(bytes) ?? {};
};

export const readRemoteSongTags = async (source: string): Promise<SongTags> => {
  try {
    if (source.startsWith('blob:')) return await readSongTags(await (await fetch(source)).blob());
    const head = await readRange(source, 0, PROBE_BYTES);
    if (!head) return {};
    if (mp4Box(head)?.type === 'ftyp') return await readMp4Tags(source);
    return await readHeadTags(source, head);
  } catch {
    return {};
  }
};
