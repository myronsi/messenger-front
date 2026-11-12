import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMedia } from '@/shared/api/fetchMedia';
import { downloadFile } from './downloadFile';

vi.mock('@/shared/api/fetchMedia', () => ({ fetchMedia: vi.fn() }));

const streamed = (chunks: number[], length?: number) => new Response(new ReadableStream({
  start(controller) {
    chunks.forEach((size) => controller.enqueue(new Uint8Array(size)));
    controller.close();
  },
}), { headers: length ? { 'content-length': String(length) } : {} });

afterEach(() => vi.restoreAllMocks());

describe('downloadFile', () => {
  it('reports progress from the content length and saves the file', async () => {
    vi.mocked(fetchMedia).mockResolvedValue(streamed([25, 75], 100));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:file', revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const progress: (number | null)[] = [];
    await downloadFile('/media/a.zip', 'a.zip', { onProgress: (value) => progress.push(value) });
    expect(fetchMedia).toHaveBeenCalledWith('/media/a.zip?download=1', expect.objectContaining({ method: 'GET' }));
    expect(progress).toEqual([0, 25, 100]);
    expect(click).toHaveBeenCalledOnce();
  });

  it('reports an unknown size without a percentage', async () => {
    vi.mocked(fetchMedia).mockResolvedValue(streamed([10]));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const progress: (number | null)[] = [];
    await downloadFile('/media/a.zip', 'a.zip', { onProgress: (value) => progress.push(value) });
    expect(progress).toEqual([null]);
  });

  it('saves nothing when the download was cancelled', async () => {
    const controller = new AbortController();
    vi.mocked(fetchMedia).mockImplementation(async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError'); });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await downloadFile('/media/a.zip', 'a.zip', { signal: controller.signal });
    expect(click).not.toHaveBeenCalled();
  });
});
