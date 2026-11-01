import { asApiError } from '@/shared/lib/apiError';
import { authFetch, ensureAccessToken, refreshAccessToken } from '@/shared/auth/session';
import { isGoApi } from './goSocket';
import type { components } from './generated/schema';
import { applyClientVersionToXhr, reportIfClientOutdated } from '@/shared/api/clientVersionFetch';

interface UploadWithProgressOptions {
  url: string;
  formData: FormData;
  onProgress?: (percent: number) => void;
}

const sendUploadRequest = async <T>({ url, formData, onProgress }: UploadWithProgressOptions, token: string | null): Promise<T> => (
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
    applyClientVersionToXhr(xhr);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(percent);
    };

    xhr.onload = () => {
      const body = xhr.responseText;
      let parsedBody: unknown = body;
      if (body) {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          parsedBody = body;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(parsedBody as T);
        return;
      }

      reportIfClientOutdated(xhr.status, parsedBody);
      reject({ status: xhr.status, body: parsedBody });
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(formData);
  })
);

export const uploadWithProgress = async <T = unknown>(options: UploadWithProgressOptions): Promise<T> => {
  if (isGoApi() && /\/messages\/(upload|vm)$/.test(options.url)) {
    const voice = options.url.endsWith('/vm');
    const base = String(import.meta.env.VITE_BASE_URL).replace(/\/$/, '');
    const form = new FormData();
    form.set('file', options.formData.get('file')!);
    form.set('purpose', 'message');
    if (voice) form.set('kind', 'voice');
    const attachment = await uploadWithProgress<components['schemas']['Attachment']>({
      ...options, url: `${base}/attachments`, formData: form,
      onProgress: percent => options.onProgress?.(Math.min(percent, 95)),
    });
    const response = await authFetch(`${base}/chats/${options.formData.get('chat_id')}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_temp_id: crypto.randomUUID(), type: voice ? 'voice' : 'file',
        attachment_id: attachment.id, content: options.formData.get('caption') || null }),
    });
    if (!response.ok) throw { status: response.status, body: await response.json() };
    options.onProgress?.(100);
    return await response.json() as T;
  }
  const token = await ensureAccessToken();

  try {
    return await sendUploadRequest<T>(options, token);
  } catch (caught) {
    const error = asApiError(caught);
    if (error?.status !== 401) throw caught;
  }

  const refreshedToken = await refreshAccessToken();
  return sendUploadRequest<T>(options, refreshedToken);
};
