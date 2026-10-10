import { asApiError } from '@/shared/lib/apiError';
import { ensureAccessToken, refreshAccessToken } from '@/shared/auth/session';
import { applyClientVersionToXhr, reportIfClientOutdated } from '@/shared/api/clientVersionFetch';

interface UploadWithProgressOptions {
  url: string;
  formData: FormData;
  onProgress?: (percent: number) => void;
  // Aborting cancels the upload; the promise rejects with an AbortError.
  signal?: AbortSignal;
}

const abortError = () => new DOMException('Upload cancelled', 'AbortError');

export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const sendUploadRequest = async <T>({ url, formData, onProgress, signal }: UploadWithProgressOptions, token: string | null): Promise<T> => (
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const settle = () => signal?.removeEventListener('abort', onAbort);

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
      settle();
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

    xhr.onerror = () => {
      settle();
      reject(new Error('Upload failed'));
    };
    xhr.onabort = () => {
      settle();
      reject(abortError());
    };
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
