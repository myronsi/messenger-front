import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/shared/auth/session';
import { API_ROOT } from './apiUrl';
import { loadMediaUrl, needsToken, toAbsoluteMediaUrl, useMediaSrc } from './media';

vi.mock('@/shared/auth/session', () => ({ authFetch: vi.fn() }));

// jsdom's Blob does not mix with Node's Response, so the fetch answers are minimal fakes.
const answer = (status = 200) => ({ ok: status < 400, status, blob: async () => new Blob(['png']) }) as unknown as Response;
const origin = new URL(API_ROOT).origin;

let counter = 0;
beforeEach(() => {
  vi.mocked(authFetch).mockReset();
  URL.createObjectURL = vi.fn(() => { counter += 1; return `blob:media-${counter}`; });
  URL.revokeObjectURL = vi.fn();
});

describe('media', () => {
  it('resolves host-relative API paths against the API origin', () => {
    const url = toAbsoluteMediaUrl(`${new URL(API_ROOT).pathname}/users/1/avatar?version=2`);
    expect(url).toBe(`${API_ROOT}/users/1/avatar?version=2`);
    expect(url.startsWith(origin)).toBe(true);
    expect(needsToken(url)).toBe(true);
    expect(needsToken('https://cdn.example.test/a.png')).toBe(false);
    expect(toAbsoluteMediaUrl('blob:x')).toBe('blob:x');
    expect(toAbsoluteMediaUrl('/static/avatars/default.jpg')).toBe('/static/avatars/default.jpg');
  });

  it('fetches API media once with the token and shares the object URL', async () => {
    vi.mocked(authFetch).mockResolvedValue(answer());
    const url = `${API_ROOT}/users/1/avatar?version=3`;
    const [a, b] = await Promise.all([loadMediaUrl(url), loadMediaUrl(url)]);
    expect(a).toMatch(/^blob:media-/);
    expect(b).toBe(a);
    await expect(loadMediaUrl(url)).resolves.toBe(a);
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed fetch', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(answer(403)).mockResolvedValueOnce(answer());
    const url = `${API_ROOT}/attachments/a/content`;
    await expect(loadMediaUrl(url)).rejects.toThrow('media 403');
    await expect(loadMediaUrl(url)).resolves.toMatch(/^blob:media-/);
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it('useMediaSrc shows the fallback until the media is loaded, and other URLs at once', async () => {
    vi.mocked(authFetch).mockResolvedValue(answer());
    const { result } = renderHook(() => useMediaSrc(`${API_ROOT}/users/7/avatar?version=1`, '/default.png'));
    expect(result.current).toBe('/default.png');
    await waitFor(() => expect(result.current).toMatch(/^blob:media-/));

    const plain = renderHook(() => useMediaSrc('https://cdn.example.test/a.png', '/default.png'));
    expect(plain.result.current).toBe('https://cdn.example.test/a.png');
    const empty = renderHook(() => useMediaSrc(null, '/default.png'));
    expect(empty.result.current).toBe('/default.png');
  });
});
