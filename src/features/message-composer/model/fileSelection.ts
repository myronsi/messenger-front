import type { Drawing } from '@/shared/ui/drawing';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { isAlbumFile, MAX_ALBUM_ITEMS, uploadLimitMegabytes, validateUploadFile } from '@/shared/lib/uploadValidation';

export const MAX_SEPARATE_FILES = 10;

export interface SelectionTexts {
  uploadFileTooLarge: string;
  uploadUnsupportedType: string;
  albumLimit: string;
  separateFilesLimit: string;
}

export type SelectionResult = { files: File[]; error?: undefined } | { error: string; files?: undefined };

export interface PlannedUpload {
  file: File | File[];
  caption: string;
  drawings: (Drawing | undefined)[];
}

export const splitSelection = (files: readonly File[]) => ({
  media: files.filter(isAlbumFile),
  others: files.filter((file) => !isAlbumFile(file)),
});

export const addToSelection = (current: readonly File[], incoming: readonly File[], albumsEnabled: boolean, texts: SelectionTexts): SelectionResult => {
  for (const file of incoming) {
    const error = validateUploadFile(file);
    if (error === 'tooLarge') return { error: fillTemplate(texts.uploadFileTooLarge, { size: String(uploadLimitMegabytes(file.name)) }) };
    if (error) return { error: texts.uploadUnsupportedType };
  }
  if (!albumsEnabled) return { files: incoming.slice(0, 1) };
  const next = [...current, ...incoming];
  const { media, others } = splitSelection(next);
  if (media.length > MAX_ALBUM_ITEMS) return { error: fillTemplate(texts.albumLimit, { max: String(MAX_ALBUM_ITEMS) }) };
  if (others.length > MAX_SEPARATE_FILES) return { error: fillTemplate(texts.separateFilesLimit, { max: String(MAX_SEPARATE_FILES) }) };
  return { files: next };
};

export const canAddToSelection = (files: readonly File[]) => {
  const { media, others } = splitSelection(files);
  return media.length < MAX_ALBUM_ITEMS || others.length < MAX_SEPARATE_FILES;
};

export const planUploads = (files: readonly File[], caption: string, drawingsOf: (files: readonly File[]) => (Drawing | undefined)[]): PlannedUpload[] => {
  const { media, others } = splitSelection(files);
  const groups = [...(media.length ? [media] : []), ...others.map((file) => [file])];
  return groups.map((group, index) => ({
    file: group.length === 1 ? group[0] : group,
    caption: index === 0 ? caption : '',
    drawings: drawingsOf(group),
  }));
};
