import { asApiError } from '@/shared/lib/apiError';
import { ensureAccessToken, refreshAccessToken } from '@/shared/auth/session';

interface UploadWithProgressOptions {
  url: string;
  formData: FormData;
  onProgress?: (percent: number) => void;
}

const sendUploadRequest = async <T>({ url, formData, onProgress }: UploadWithProgressOptions, token: string | null): Promise<T> => (
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
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

      reject({ status: xhr.status, body: parsedBody });
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(formData);
  })
);

export const uploadWithProgress = async <T = unknown>(options: UploadWithProgressOptions): Promise<T> => {
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
