import { baseName, extensionOf } from '../parsers/common';
import { readZipEntries, readZipEntry, type ZipEntry } from './zipReader';

export interface ExportArchive {
  paths: readonly string[];
  size: (path: string) => number;
  file: (path: string) => Promise<File>;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp',
  opus: 'audio/ogg', ogg: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  pdf: 'application/pdf', txt: 'text/plain', json: 'application/json', vcf: 'text/vcard',
};

export const mimeOf = (name: string) => MIME[extensionOf(name)] ?? 'application/octet-stream';

export const normalizePath = (path: string) => path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');

export const dirName = (path: string) => {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
};

const missing = (path: string) => new Error(`missing ${path}`);

export const zipArchive = async (blob: Blob): Promise<ExportArchive> => {
  const entries = new Map<string, ZipEntry>((await readZipEntries(blob)).map((entry) => [normalizePath(entry.name), entry]));
  return {
    paths: [...entries.keys()],
    size: (path) => entries.get(path)?.size ?? 0,
    file: async (path) => {
      const entry = entries.get(path);
      if (!entry) throw missing(path);
      return new File([await readZipEntry(blob, entry)], baseName(path), { type: mimeOf(path) });
    },
  };
};

const relativePath = (file: File) => normalizePath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);

export const filesArchive = (files: readonly File[]): ExportArchive => {
  const byPath = new Map(files.map((file) => [relativePath(file), file]));
  return {
    paths: [...byPath.keys()],
    size: (path) => byPath.get(path)?.size ?? 0,
    file: async (path) => {
      const file = byPath.get(path);
      if (!file) throw missing(path);
      return file.type ? file : new File([file], file.name, { type: mimeOf(file.name) });
    },
  };
};

export const pathResolver = (paths: readonly string[], base: string) => {
  const known = new Set(paths);
  const byName = new Map<string, string | null>();
  for (const path of paths) {
    const name = baseName(path);
    byName.set(name, byName.has(name) ? null : path);
  }
  return (path: string) => {
    const relative = normalizePath(path);
    const joined = base ? `${base}/${relative}` : relative;
    if (known.has(joined)) return joined;
    if (known.has(relative)) return relative;
    return byName.get(baseName(relative)) ?? null;
  };
};
