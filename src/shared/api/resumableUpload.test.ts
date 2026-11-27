import { afterEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/shared/auth/session', () => ({ authFetch: (...args: unknown[]) => authFetch(...args) }));

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

describe('resumableUpload', () => {
  afterEach(() => authFetch.mockReset());

  it('sends the file in chunks, continues where the server stands and completes', async () => {
    const { resumableUpload, shouldResume, RESUMABLE_FROM } = await import('./resumableUpload');
    const file = new File([new Uint8Array(25)], 'clip.mp4', { type: 'video/mp4' });
    expect(shouldResume(file)).toBe(false);
    expect(shouldResume(new File([new Uint8Array(RESUMABLE_FROM + 1)], 'big'))).toBe(true);
    const session = { id: 's1', size: 25, chunk_size: 10, received: 0, expires_at: '2026-11-19T00:00:00Z' };
    const chunks: string[] = [];
    authFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload-sessions')) return json(session, 201);
      if (url.includes('/chunks')) {
        const offset = Number(new URL(url, 'http://x').searchParams.get('offset'));
        const size = (init?.body as Blob).size;
        chunks.push(`${offset}:${size}`);
        if (offset === 10 && chunks.length === 2) return json({ ...session, received: 20 }, 409);
        return json({ ...session, received: Math.min(25, offset + size) });
      }
      if (url.endsWith('/complete')) return json({ id: 'a1', kind: 'video' }, 201);
      throw new Error(url);
    });
    const progress: number[] = [];
    const attachment = await resumableUpload(file, { onProgress: (percent) => progress.push(percent) });
    expect(attachment).toMatchObject({ id: 'a1' });
    expect(chunks).toEqual(['0:10', '10:10', '20:5']);
    expect(progress[progress.length - 1]).toBe(100);
    expect(JSON.parse(String(authFetch.mock.calls[0][1].body))).toMatchObject({ purpose: 'message', filename: 'clip.mp4', size: 25 });
  });

  it('cancels the session when aborted', async () => {
    const { resumableUpload } = await import('./resumableUpload');
    const controller = new AbortController();
    authFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/upload-sessions')) {
        controller.abort();
        return json({ id: 's2', size: 5, chunk_size: 10, received: 0, expires_at: '2026-11-19T00:00:00Z' }, 201);
      }
      return new Response(null, { status: 204 });
    });
    await expect(resumableUpload(new File([new Uint8Array(5)], 'x'), { signal: controller.signal })).rejects.toThrow('Upload cancelled');
    expect(authFetch.mock.calls.some(([url, init]) => String(url).endsWith('/upload-sessions/s2') && init?.method === 'DELETE')).toBe(true);
  });

  const deleted = (id: string) => authFetch.mock.calls.some(([url, init]) => String(url).endsWith(`/upload-sessions/${id}`) && init?.method === 'DELETE');

  it('cancels the session when stopped while a chunk is on its way', async () => {
    const { resumableUpload } = await import('./resumableUpload');
    const controller = new AbortController();
    authFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload-sessions')) return json({ id: 's3', size: 5, chunk_size: 10, received: 0, expires_at: '2026-11-19T00:00:00Z' }, 201);
      if (url.includes('/chunks')) {
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      }
      expect(init?.keepalive).toBe(true);
      return new Response(null, { status: 204 });
    });
    await expect(resumableUpload(new File([new Uint8Array(5)], 'x'), { signal: controller.signal })).rejects.toThrow('Upload cancelled');
    expect(deleted('s3')).toBe(true);
  });

  it('cancels the session when completing fails', async () => {
    const { resumableUpload } = await import('./resumableUpload');
    authFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/upload-sessions')) return json({ id: 's4', size: 5, chunk_size: 10, received: 0, expires_at: '2026-11-19T00:00:00Z' }, 201);
      if (url.includes('/chunks')) return json({ id: 's4', size: 5, chunk_size: 10, received: 5, expires_at: '2026-11-19T00:00:00Z' });
      if (url.endsWith('/complete')) return json({ code: 'internal_error' }, 503);
      return new Response(null, { status: 204 });
    });
    await expect(resumableUpload(new File([new Uint8Array(5)], 'x'))).rejects.toMatchObject({ status: 503 });
    expect(deleted('s4')).toBe(true);
  });
});
