import { describe, expect, it } from 'vitest';
import { readFlac, readId3, readMp4, readSongTags, songTitleFromFile } from './songTags';

const bytes = (...parts: (number[] | string | Uint8Array)[]) => {
  const chunks = parts.map((part) => (typeof part === 'string' ? new TextEncoder().encode(part) : Uint8Array.from(part)));
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
};
const be32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const le32 = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
const safe = (value: number) => [(value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f];
const utf16 = (text: string) => [0xff, 0xfe, ...[...text].flatMap((char) => [char.charCodeAt(0), 0])];
const latin1 = (text: string) => [...text].map((char) => char.charCodeAt(0));
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3];

const id3 = (version: number, frames: Uint8Array) => bytes('ID3', [version, 0, 0], safe(frames.length), frames);
const frame23 = (id: string, body: number[]) => bytes(id, be32(body.length), [0, 0], body);
const frame24 = (id: string, body: number[]) => bytes(id, safe(body.length), [0, 0], body);
const frame22 = (id: string, body: number[]) => bytes(id, [(body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff], body);

const blobBytes = async (blob?: Blob) => Array.from(new Uint8Array(await blob!.arrayBuffer()));

describe('song tags', () => {
  it('reads ID3v2.3 title in UTF-16, artist in Latin-1 and the cover picture', async () => {
    const tags = readId3(id3(3, bytes(
      frame23('TIT2', [1, ...utf16('Bed of Roses')]),
      frame23('TPE1', [0, ...latin1('Mindless Self Indulgence')]),
      frame23('APIC', [0, ...latin1('image/jpeg'), 0, 3, ...latin1('cover'), 0, ...JPEG]),
    )));
    expect(tags).toMatchObject({ title: 'Bed of Roses', artist: 'Mindless Self Indulgence' });
    expect(tags?.cover?.type).toBe('image/jpeg');
    expect(await blobBytes(tags?.cover)).toEqual(JPEG);
  });

  it('reads ID3v2.4 UTF-8 frames with synchsafe sizes and joins several artists', () => {
    const tags = readId3(id3(4, bytes(
      frame24('TIT2', [3, ...new TextEncoder().encode('Пісня')]),
      frame24('TPE1', [3, ...new TextEncoder().encode('A\0B')]),
    )));
    expect(tags).toEqual({ title: 'Пісня', artist: 'A / B' });
  });

  it('reads ID3v2.2 three letter frames', () => {
    const tags = readId3(id3(2, bytes(frame22('TT2', [0, ...latin1('Old')]), frame22('TP1', [0, ...latin1('Band')]))));
    expect(tags).toEqual({ title: 'Old', artist: 'Band' });
  });

  it('reads FLAC Vorbis comments and the picture block', async () => {
    const comment = (text: string) => [...le32(text.length), ...latin1(text)];
    const vorbis = [...le32(6), ...latin1('vendor'), ...le32(2), ...comment('TITLE=Flac Song'), ...comment('artist=Flac Band')];
    const sizes = [...be32(1), ...be32(1), ...be32(24), ...be32(0)];
    const picture = [...be32(3), ...be32(9), ...latin1('image/png'), ...be32(0), ...sizes, ...be32(3), 9, 8, 7];
    const block = (type: number, body: number[], last = false) => [
      (last ? 0x80 : 0) | type, (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff, ...body,
    ];
    const tags = readFlac(bytes('fLaC', block(4, vorbis), block(6, picture, true)));
    expect(tags).toMatchObject({ title: 'Flac Song', artist: 'Flac Band' });
    expect(tags?.cover?.type).toBe('image/png');
    expect(await blobBytes(tags?.cover)).toEqual([9, 8, 7]);
  });

  it('reads M4A title, artist and cover from the ilst atoms', async () => {
    const atom = (type: string, body: Uint8Array | number[]) => bytes(be32(8 + body.length), latin1(type), body);
    const data = (kind: number, payload: number[]) => atom('data', [...be32(kind), 0, 0, 0, 0, ...payload]);
    const ilst = atom('ilst', bytes(
      atom('©nam', data(1, [...new TextEncoder().encode('M4A Song')])),
      atom('©ART', data(1, [...new TextEncoder().encode('M4A Band')])),
      atom('covr', data(13, JPEG)),
    ));
    const file = bytes(atom('ftyp', latin1('M4A ')), atom('moov', atom('udta', atom('meta', bytes([0, 0, 0, 0], ilst)))));
    const tags = readMp4(file);
    expect(tags).toMatchObject({ title: 'M4A Song', artist: 'M4A Band' });
    expect(await blobBytes(tags?.cover)).toEqual(JPEG);
  });

  it('finds the right format from a file and gives nothing for unknown files', async () => {
    const mp3 = new Blob([id3(3, frame23('TIT2', [0, ...latin1('From blob')]))]);
    expect(await readSongTags(mp3)).toEqual({ title: 'From blob' });
    expect(await readSongTags(new Blob([bytes('OggS', [0, 0, 0, 0])]))).toEqual({});
  });

  it('makes a readable fallback title from the file name', () => {
    expect(songTitleFromFile('bed_of_roses.mp3')).toBe('bed of roses');
    expect(songTitleFromFile('Track.01.flac')).toBe('Track.01');
  });
});
