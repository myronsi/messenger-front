import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';
import { resumableUpload, shouldResume } from '@/shared/api/resumableUpload';
import { UploadError, uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { validateUploadFile } from '@/shared/lib/uploadValidation';
import type { SkipReason } from './importRequest';
import type { ParsedAttachment } from './types';

type Attachment = components['schemas']['Attachment'];

export type UploadOutcome = { id: EntityId } | { skipped: SkipReason };

export const precheck = (attachment: ParsedAttachment): SkipReason | null => {
  const problem = validateUploadFile({ name: attachment.name, size: attachment.size ?? 1 });
  if (problem === 'tooLarge') return 'fileTooLarge';
  if (problem === 'unsupportedType') return 'fileUnsupported';
  return problem === 'empty' ? 'fileMissing' : null;
};

const SKIP_STATUS: Record<number, SkipReason> = { 413: 'fileTooLarge', 415: 'fileUnsupported' };

export const uploadImportFile = async (file: File, attachment: ParsedAttachment, importId: EntityId, signal?: AbortSignal): Promise<UploadOutcome> => {
  const kind = attachment.kind === 'voice' ? 'voice' : undefined;
  try {
    if (shouldResume(file)) return { id: (await resumableUpload(file, { kind, signal })).id };
    const form = new FormData();
    form.set('file', file, attachment.name);
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
