import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ authFetch: vi.fn(), token: 'first' as string | null }));

vi.mock('@/shared/auth/session', () => ({
  authFetch: session.authFetch,
  subscribeToAccessToken: () => () => undefined,
  useAccessToken: () => session.token,
}));

import { clearMediaCache } from './mediaCache';
import { useAuthenticatedMedia } from './useAuthenticatedMedia';

const source = `${window.location.origin}/api/v2/users/7/avatar`;

beforeEach(() => {
  session.token = 'first';
  let count = 0;
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:avatar-${++count}`), revokeObjectURL: vi.fn() });
  session.authFetch.mockImplementation(async () => new Response('png', { status: 200 }));
});

afterEach(() => {
  clearMediaCache();
  vi.clearAllMocks();
});

describe('useAuthenticatedMedia', () => {
  it('keeps the image when the access token is refreshed', async () => {
    const { result, rerender } = renderHook(() => useAuthenticatedMedia(source));
    await waitFor(() => expect(result.current).toBe('blob:avatar-1'));

    session.token = 'second';
    rerender();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toBe('blob:avatar-1');
    expect(session.authFetch).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('loads a failed image again once a new access token arrives', async () => {
    session.authFetch
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('image', { status: 200 }));
    const { result, rerender } = renderHook(() => useAuthenticatedMedia(source, 'fallback.png'));
    await waitFor(() => expect(result.current).toBe('fallback.png'));

    rerender();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(session.authFetch).toHaveBeenCalledTimes(1);

    session.token = 'second';
    rerender();
    await waitFor(() => expect(result.current).toBe('blob:avatar-1'));
    expect(session.authFetch).toHaveBeenCalledTimes(2);
  });

  it('shows an image another component already loaded on the first render', async () => {
    const first = renderHook(() => useAuthenticatedMedia(source));
    await waitFor(() => expect(first.result.current).toBe('blob:avatar-1'));

    const second = renderHook(() => useAuthenticatedMedia(source));

    expect(second.result.current).toBe('blob:avatar-1');
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('uses the fallback when the image cannot be loaded', async () => {
    session.authFetch.mockResolvedValueOnce(new Response('', { status: 404 }));
    const onFailure = vi.fn();

    const { result } = renderHook(() => useAuthenticatedMedia(source, '/fallback.png', true, onFailure));

    await waitFor(() => expect(result.current).toBe('/fallback.png'));
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
