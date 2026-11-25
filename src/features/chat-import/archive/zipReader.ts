import { inflateSync } from 'fflate';

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_EOCD = 0x06064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;

export class ZipError extends Error {}

const readBytes = async (blob: Blob, start: number, end: number) => new DataView(await blob.slice(start, end).arrayBuffer());

const findEnd = (view: DataView) => {
  for (let position = view.byteLength - 22; position >= 0; position -= 1) {
    if (view.getUint32(position, true) === EOCD) return position;
  }
  return -1;
};

interface Directory {
  count: number;
  size: number;
  offset: number;
}

const zip64Directory = async (blob: Blob, tail: DataView, tailStart: number, end: number): Promise<Directory> => {
  const locator = end - 20;
  if (locator < 0 || tail.getUint32(locator, true) !== ZIP64_LOCATOR) throw new ZipError('zip64 locator missing');
  const recordOffset = Number(tail.getBigUint64(locator + 8, true));
  const record = recordOffset >= tailStart
    ? new DataView(tail.buffer, tail.byteOffset + recordOffset - tailStart)
    : await readBytes(blob, recordOffset, recordOffset + 56);
  if (record.getUint32(0, true) !== ZIP64_EOCD) throw new ZipError('zip64 record missing');
  return { count: Number(record.getBigUint64(32, true)), size: Number(record.getBigUint64(40, true)), offset: Number(record.getBigUint64(48, true)) };
};

const readDirectory = async (blob: Blob): Promise<Directory> => {
  const tailStart = Math.max(0, blob.size - 65_557);
  const tail = await readBytes(blob, tailStart, blob.size);
  const end = findEnd(tail);
  if (end < 0) throw new ZipError('not a zip file');
  const count = tail.getUint16(end + 10, true);
  const size = tail.getUint32(end + 12, true);
  const offset = tail.getUint32(end + 16, true);
  if (count === MAX_U16 || size === MAX_U32 || offset === MAX_U32) return zip64Directory(blob, tail, tailStart, end);
  return { count, size, offset };
};

const zip64Values = (view: DataView, start: number, length: number, entry: ZipEntry) => {
  let position = start;
  while (position + 4 <= start + length) {
    const id = view.getUint16(position, true);
    const size = view.getUint16(position + 2, true);
    if (id === 0x0001) {
      let field = position + 4;
      const next = () => {
        const value = Number(view.getBigUint64(field, true));
        field += 8;
        return value;
      };
      if (entry.size === MAX_U32) entry.size = next();
      if (entry.compressedSize === MAX_U32) entry.compressedSize = next();
      if (entry.offset === MAX_U32) entry.offset = next();
      return;
    }
    position += 4 + size;
  }
};

const decoder = new TextDecoder('utf-8');

export const readZipEntries = async (blob: Blob): Promise<ZipEntry[]> => {
  const directory = await readDirectory(blob);
  const view = await readBytes(blob, directory.offset, directory.offset + directory.size);
  const entries: ZipEntry[] = [];
  let position = 0;
  for (let index = 0; index < directory.count; index += 1) {
    if (position + 46 > view.byteLength || view.getUint32(position, true) !== CENTRAL) throw new ZipError('broken central directory');
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + position + 46, nameLength));
    const entry: ZipEntry = {
      name,
      method: view.getUint16(position + 10, true),
      compressedSize: view.getUint32(position + 20, true),
      size: view.getUint32(position + 24, true),
      offset: view.getUint32(position + 42, true),
    };
    zip64Values(view, position + 46 + nameLength, extraLength, entry);
    if (!name.endsWith('/')) entries.push(entry);
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

export const readZipEntry = async (blob: Blob, entry: ZipEntry): Promise<Uint8Array<ArrayBuffer>> => {
  const header = await readBytes(blob, entry.offset, entry.offset + 30);
  if (header.getUint32(0, true) !== LOCAL) throw new ZipError('broken local header');
  const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const data = new Uint8Array(await blob.slice(start, start + entry.compressedSize).arrayBuffer());
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateSync(data, { out: new Uint8Array(entry.size) });
  throw new ZipError(`unsupported compression ${entry.method}`);
};
