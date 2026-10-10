import type { components } from '@/shared/api/generated/schema';
import { apiUrl } from '@/shared/api/apiUrl';
import { authFetch } from '@/shared/auth/session';
import { errorFromResponse } from '@/shared/lib/apiError';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';

export type Attachment = components['schemas']['Attachment'];
export type UploadPurpose = components['schemas']['UploadPurpose'];

// uploadAttachment stores a file (POST /attachments) and returns its attachment; the attachment's id is
// what messages, avatars and group avatars refer to. A failed upload rejects with an ApiError
// (read it with apiErrorMessage).
export const uploadAttachment = async (file: File | Blob, purpose: UploadPurpose, fileName?: string): Promise<Attachment> => {
  const form = new FormData();
  form.append('file', file, fileName ?? (file instanceof File ? file.name : 'upload'));
  form.append('purpose', purpose);
  const response = await authFetch(apiUrl('/attachments'), { method: 'POST', body: form });
  if (!response.ok) throw await errorFromResponse(response);
  return response.json() as Promise<Attachment>;
};

// uploadAttachmentWithProgress is uploadAttachment with upload progress (0-100), for message files and
// voice messages; `kind: 'voice'` makes the server measure duration and waveform.
export const uploadAttachmentWithProgress = (
  file: File | Blob,
  options: { purpose: UploadPurpose; kind?: Attachment['kind']; fileName?: string; onProgress?: (percent: number) => void },
): Promise<Attachment> => {
  const form = new FormData();
  form.append('file', file, options.fileName ?? (file instanceof File ? file.name : 'upload'));
  form.append('purpose', options.purpose);
  if (options.kind) form.append('kind', options.kind);
  return uploadWithProgress<Attachment>({ url: apiUrl('/attachments'), formData: form, onProgress: options.onProgress })
    .catch((caught: unknown) => {
      // uploadWithProgress rejects with { status, body }; shape it like every other API error.
      const failure = caught as { status?: number; body?: unknown };
      throw failure && typeof failure.status === 'number' ? { status: failure.status, data: failure.body } : caught;
    });
};
