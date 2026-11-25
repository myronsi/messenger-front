import type { EntityId } from '@/shared/api/entityId';
import type { ImportSource } from './types';

const KEY = 'chat-import:pending';

export interface ResumeRecord {
  importId: EntityId;
  chatId: EntityId;
  title: string;
  source: ImportSource;
  total: number;
  fileKey: string;
  uploaded: Record<string, EntityId>;
}

export const fileKeyOf = (files: readonly File[]) => files
  .map((file) => `${(file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name}:${file.size}`)
  .sort((a, b) => a.localeCompare(b))
  .join('|');

const isRecord = (value: unknown): value is ResumeRecord => {
  const record = value as Partial<ResumeRecord> | null;
  return !!record && record.importId !== undefined && typeof record.fileKey === 'string' && typeof record.uploaded === 'object';
};

export const loadResume = (): ResumeRecord | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveResume = (record: ResumeRecord) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    return;
  }
};

export const clearResume = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
};
