import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRemoteSongTags } from './remoteSongTags';

const bytes = (...parts: (number[] | string | Uint8Array)[]) => {
  const chunks = parts.map((part) => (typeof part === 'string' ? Uint8Array.from([...part].map((char) => char.charCodeAt(0))) : Uint8Array.from(part)));
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
};
const be32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const le32 = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
const be24 = (value: number) => [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const safe = (value: number) => [(value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f];
const filler = (size: number) => new Uint8Array(size).fill(0x55);
const JPEG = [0xff, 0xd8, 0xff, 0xe0];

const frame = (id: string, body: Uint8Array) => bytes(id, be32(body.length), [0, 0], body);
const id3File = (cover: number, audio: number) => {
  const frames = bytes(
    frame('TIT2', bytes([0], 'Kick Remix')),
    frame('TPE1', bytes([0], 'Mindless Self Indulgence')),
    frame('APIC', bytes([0], 'image/jpeg', [0, 3, 0], JPEG, filler(cover))),
  );
  return bytes('ID3', [3, 0, 0], safe(frames.length), frames, filler(audio));
};

const flacBlock = (type: number, last: boolean, body: Uint8Array) => bytes([(last ? 0x80 : 0) | type], be24(body.length), body);
const flacFile = (cover: number) => bytes(
  'fLaC',
  flacBlock(0, false, filler(34)),
  flacBlock(4, false, bytes(le32(1), 'x', le32(1), le32(11), 'TITLE=Flacy')),
  flacBlock(6, true, bytes(be32(3), be32(10), 'image/jpeg', be32(0), filler(16), be32(JPEG.length + cover), JPEG, filler(cover))),
  filler(200_000),
);

const box = (type: number[] | string, ...children: Uint8Array[]) => {
  const body = bytes(...children);
  return bytes(be32(8 + body.length), type, body);
};
const mp4File = (media: number) => bytes(
  box('ftyp', bytes('M4A ')),
  box('mdat', filler(media)),
  box('moov', box('udta', box('meta', bytes([0, 0, 0, 0]), box('ilst', box([0xa9, 0x6e, 0x61, 0x6d], box('data', bytes(be32(1), be32(0), 'Moov Song'))))))),
);

const serve = (file: Uint8Array, { ranges = true } = {}) => {
  const served: Array<[number, number]> = [];
  const fetcher = vi.fn(async (_source: string, init?: RequestInit) => {
    const header = new Headers(init?.headers).get('Range');
    const match = header ? /bytes=(\d+)-(\d+)/.exec(header) : null;
    if (!ranges || !match) {
      served.push([0, file.length]);
      return new Response(file.slice(), { status: 200 });
    }
    const start = Number(match[1]);
    const end = Math.min(file.length, Number(match[2]) + 1);
    served.push([start, end]);
    return new Response(file.slice(start, end), { status: 206 });
  });
  vi.stubGlobal('fetch', fetcher);
  return { fetcher, served, total: () => served.reduce((sum, [start, end]) => sum + end - start, 0) };
};

afterEach(() => vi.unstubAllGlobals());

describe('readRemoteSongTags', () => {
  it('reads an ID3 tag with a large cover by asking for exactly the tag bytes', async () => {
    const file = id3File(60_000, 5_000_000);
    const server = serve(file);
    const tags = await readRemoteSongTags('/attachments/song/content');
    expect(tags).toMatchObject({ title: 'Kick Remix', artist: 'Mindless Self Indulgence' });
    expect(tags.cover?.size).toBe(JPEG.length + 60_000);
    expect(server.fetcher).toHaveBeenCalledTimes(2);
    expect(server.total()).toBeLessThan(100_000);
  });

  it('needs one small request when the tag fits the first chunk', async () => {
    const server = serve(id3File(100, 5_000_000));
    expect(await readRemoteSongTags('/song')).toMatchObject({ title: 'Kick Remix' });
    expect(server.served).toEqual([[0, 16 * 1024]]);
  });

  it('stops after the first chunk when the server ignores ranges', async () => {
    const server = serve(id3File(60_000, 5_000_000), { ranges: false });
    expect(await readRemoteSongTags('/song')).toMatchObject({ title: 'Kick Remix', artist: 'Mindless Self Indulgence' });
    expect(server.fetcher).toHaveBeenCalledTimes(2);
  });

  it('reads FLAC metadata blocks that end after the first chunk', async () => {
    const server = serve(flacFile(30_000));
    const tags = await readRemoteSongTags('/song.flac');
    expect(tags.title).toBe('Flacy');
    expect(tags.cover?.size).toBe(JPEG.length + 30_000);
    expect(server.total()).toBeLessThan(70_000);
  });

  it('skips the media box of an MP4 and reads only the movie box', async () => {
    const server = serve(mp4File(3_000_000));
    expect(await readRemoteSongTags('/song.m4a')).toMatchObject({ title: 'Moov Song' });
    expect(server.total()).toBeLessThan(40_000);
  });

  it('reads a local blob in full and returns nothing for unknown formats', async () => {
    serve(bytes('OggS', filler(100)));
    expect(await readRemoteSongTags('blob:local')).toEqual({});
    expect(await readRemoteSongTags('/song.ogg')).toEqual({});
  });
});
