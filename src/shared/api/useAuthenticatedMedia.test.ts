import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/shared/auth/session';
import { useAuthenticatedMedia } from './useAuthenticatedMedia';

const auth = vi.hoisted(() => ({ token: 'token-1' as string | null }));

vi.mock('@/shared/auth/session', () => ({
  authFetch: vi.fn(),
  useAccessToken: () => auth.token,
}));

let objectUrls = 0;

beforeEach(() => {
  auth.token = 'token-1';
  objectUrls = 0;
  vi.mocked(authFetch).mockReset();
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:media-${++objectUrls}`),
    revokeObjectURL: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('useAuthenticatedMedia', () => {
  it('keeps the loaded media when the access token is refreshed', async () => {
    vi.mocked(authFetch).mockResolvedValue(new Response('audio', { status: 200 }));
    const { result, rerender } = renderHook(() => useAuthenticatedMedia('/api/v2/media/1'));
    await waitFor(() => expect(result.current).toBe('blob:media-1'));
    auth.token = 'token-2';
    rerender();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe('blob:media-1');
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('loads failed media again once a new access token arrives', async () => {
    vi.mocked(authFetch)
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('image', { status: 200 }));
    const { result, rerender } = renderHook(() => useAuthenticatedMedia('/api/v2/media/2', 'fallback.png'));
    await waitFor(() => expect(result.current).toBe('fallback.png'));
    rerender();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(authFetch).toHaveBeenCalledTimes(1);
    auth.token = 'token-2';
    rerender();
    await waitFor(() => expect(result.current).toBe('blob:media-1'));
    expect(authFetch).toHaveBeenCalledTimes(2);
  });
});
