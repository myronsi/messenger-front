import { authFetch } from '@/shared/auth/session';
import { apiUrl } from './config';
import type { components } from './generated/schema';

type Session = components['schemas']['UploadSession'];
type Attachment = components['schemas']['Attachment'];

export const RESUMABLE_FROM = 10 * 1024 * 1024;
const MAX_FAILURES = 5;

export const shouldResume = (file: FormDataEntryValue): file is File => typeof file !== 'string' && file.size > RESUMABLE_FROM;

const cancelled = () => new Error('Upload cancelled');

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(cancelled()); }, { once: true });
});

const json = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw { status: response.status, body: await response.json().catch(() => null) };
  return await response.json() as T;
};

interface ResumableOptions {
  kind?: 'voice' | 'image' | 'audio' | 'video' | 'file';
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export const resumableUpload = async (file: File, { kind, onProgress, signal }: ResumableOptions = {}): Promise<Attachment> => {
  const sessionUrl = (id: string, rest = '') => apiUrl(`/upload-sessions/${id}${rest}`);
  let session = await json<Session>(await authFetch(apiUrl('/upload-sessions'), {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'message', filename: file.name || 'file', size: file.size, ...(kind && kind !== 'voice' ? { kind } : {}) }),
  }));
  const drop = () => { void authFetch(sessionUrl(session.id), { method: 'DELETE', keepalive: true }).catch(() => undefined); };
  let failures = 0;
  try {
    while (session.received < session.size) {
      if (signal?.aborted) throw cancelled();
      const end = Math.min(session.received + session.chunk_size, session.size);
      try {
        const response = await authFetch(sessionUrl(session.id, `/chunks?offset=${session.received}`), {
          method: 'PUT', signal, headers: { 'Content-Type': 'application/octet-stream' }, body: file.slice(session.received, end),
        });
        session = response.status === 409 ? await response.json() as Session : await json<Session>(response);
        failures = 0;
        onProgress?.((session.received / session.size) * 100);
      } catch (error) {
        if (signal?.aborted) throw cancelled();
        failures += 1;
        if (failures > MAX_FAILURES) throw error;
        await wait(1000 * failures, signal);
        session = await json<Session>(await authFetch(sessionUrl(session.id))).catch(() => session);
      }
    }
    return await json<Attachment>(await authFetch(sessionUrl(session.id, '/complete'), { method: 'POST', signal }));
  } catch (error) {
    drop();
    throw error;
  }
};
