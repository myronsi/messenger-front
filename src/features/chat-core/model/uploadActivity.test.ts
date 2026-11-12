import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useChatActivity } from '@/entities/typing';
import { withUploadActivity } from './uploadActivity';

describe('withUploadActivity', () => {
  it('shows the upload kind while the upload runs and ends it after a failure too', async () => {
    const { result, rerender } = renderHook(() => useChatActivity('9'));
    let seen: string | null = null;
    await withUploadActivity('9', [{ file: new Blob(['x'], { type: 'video/mp4' }), fileName: 'clip.mp4' }], async () => {
      rerender();
      seen = result.current;
    });
    expect(seen).toBe('uploading_video');
    await expect(withUploadActivity('9', [{ file: new Blob(['x']), fileName: 'a.png' }], async () => {
      throw new Error('offline');
    })).rejects.toThrow('offline');
    rerender();
    expect(result.current).toBeNull();
  });
});
