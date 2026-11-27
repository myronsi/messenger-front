import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';
import { resumableUpload, shouldResume } from '@/shared/api/resumableUpload';
import { UploadError, uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { compressImageForUpload } from '@/shared/lib/compressImage';
import { getExtension, UPLOAD_LIMIT_BYTES, validateUploadFile } from '@/shared/lib/uploadValidation';
import type { SkipReason } from './importRequest';
import type { ParsedAttachment } from './types';

type Attachment = components['schemas']['Attachment'];

export type UploadOutcome = { id: EntityId } | { skipped: SkipReason };

const SHRINKABLE = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SHRINKABLE_BYTES = 100 * 1024 * 1024;

const shrinkable = (attachment: ParsedAttachment) => SHRINKABLE.includes(getExtension(attachment.name)) && (attachment.size ?? 0) <= MAX_SHRINKABLE_BYTES;

export const isLottieSticker = (attachment: ParsedAttachment) => attachment.kind === 'sticker' && getExtension(attachment.path) === 'tgs';

export const precheck = (attachment: ParsedAttachment): SkipReason | null => {
  if (isLottieSticker(attachment)) return null;
  const problem = validateUploadFile({ name: attachment.name, size: attachment.size ?? 1 });
  if (problem === 'tooLarge') return shrinkable(attachment) ? null : 'fileTooLarge';
  if (problem === 'unsupportedType') return 'fileUnsupported';
  return problem === 'empty' ? 'fileMissing' : null;
};

const SKIP_STATUS: Record<number, SkipReason> = { 413: 'fileTooLarge', 415: 'fileUnsupported' };

const fitted = async (file: File, attachment: ParsedAttachment) => (
  file.size > UPLOAD_LIMIT_BYTES.image && shrinkable(attachment) ? compressImageForUpload(file) : file
);

export const uploadImportFile = async (original: File, attachment: ParsedAttachment, importId: EntityId, signal?: AbortSignal): Promise<UploadOutcome> => {
  const kind = attachment.kind === 'voice' ? 'voice' : undefined;
  try {
    const file = await fitted(original, attachment);
    if (file.size > UPLOAD_LIMIT_BYTES.image && shrinkable(attachment)) return { skipped: 'fileTooLarge' };
    const name = file === original ? attachment.name : file.name;
    if (shouldResume(file)) return { id: (await resumableUpload(file, { kind, signal })).id };
    const form = new FormData();
    form.set('file', file, name);
    form.set('purpose', 'message');
    form.set('import_id', String(importId));
    if (kind) form.set('kind', kind);
    const url = `${String(getApiBaseUrl()).replace(/\/$/, '')}/attachments`;
    return { id: (await uploadWithProgress<Attachment>({ url, formData: form, signal })).id };
  } catch (error) {
    const status = error instanceof UploadError ? error.status : Number((error as { status?: unknown } | null)?.status);
    if (SKIP_STATUS[status]) return { skipped: SKIP_STATUS[status] };
    throw error;
  }
};
