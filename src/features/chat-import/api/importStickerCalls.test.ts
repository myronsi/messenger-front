import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadError, uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { importStickerCalls } from './importStickerCalls';

vi.mock('@/shared/api/config', () => ({ getApiBaseUrl: () => 'http://api.test/api/v2/' }));
vi.mock('@/shared/api/uploadWithProgress', async (original) => ({
  ...(await original<typeof import('@/shared/api/uploadWithProgress')>()),
  uploadWithProgress: vi.fn(async () => ({ id: 'img-1' })),
}));

const sticker = { path: 'stickers/cat.webp', name: 'cat.webp', kind: 'sticker' as const, size: 10 };

describe('importStickerCalls.upload', () => {
  beforeEach(() => vi.mocked(uploadWithProgress).mockClear());

  it('uploads the sticker image with the import id so the import rate applies', async () => {
    const signal = new AbortController().signal;
    await expect(importStickerCalls.upload(new File(['x'], 'cat.webp'), sticker, '9 a', signal)).resolves.toBe('img-1');
    const [request] = vi.mocked(uploadWithProgress).mock.calls[0];
    expect(request.url).toBe('http://api.test/api/v2/attachments?import_id=9%20a');
    expect(request.signal).toBe(signal);
    expect(request.formData.get('purpose')).toBe('sticker');
    expect(request.formData.get('kind')).toBe('image');
  });

  it('skips a sticker the server refuses', async () => {
    vi.mocked(uploadWithProgress).mockRejectedValueOnce(new UploadError(415, null));
    await expect(importStickerCalls.upload(new File(['x'], 'cat.webp'), sticker, '9')).resolves.toBeNull();
  });
});
