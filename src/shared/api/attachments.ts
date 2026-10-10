import type { components } from '@/shared/api/generated/schema';
import { apiUrl } from '@/shared/api/apiUrl';
import { authFetch } from '@/shared/auth/session';
import { errorFromResponse } from '@/shared/lib/apiError';

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
