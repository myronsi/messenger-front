import { afterEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/shared/auth/session', () => ({ authFetch: (...args: unknown[]) => authFetch(...args) }));
const keepOfflineCopy = vi.fn();
vi.mock('./mediaCache', () => ({ keepOfflineCopy: (...args: unknown[]) => keepOfflineCopy(...args) }));

const ID = '5f0c8a64-2f2b-4c7e-9d0e-6b1f3a2c4d5e';

describe('playback URLs', () => {
  afterEach(() => {
    authFetch.mockReset();
    vi.resetModules();
  });

  it('reads the attachment and variant from content URLs', async () => {
    const { attachmentIdOf, variantOf } = await import('./playbackUrl');
    expect(attachmentIdOf(`/api/v2/attachments/${ID}/content`)).toBe(ID);
    expect(attachmentIdOf(`https://x.test/api/v2/attachments/${ID}/content?variant=animation#t=0.1`)).toBe(ID);
    expect(variantOf(`/api/v2/attachments/${ID}/content?variant=animation`)).toBe('animation');
    expect(variantOf(`/api/v2/attachments/${ID}/content?variant=thumbnail`)).toBeUndefined();
    expect(attachmentIdOf('blob:http://x/abc')).toBeUndefined();
    expect(attachmentIdOf('/static/a.mp4')).toBeUndefined();
  });

  it('asks once and reuses the URL until it is about to expire', async () => {
    const { forgetPlaybackUrl, playbackUrl } = await import('./playbackUrl');
    const expires = new Date(Date.now() + 5 * 60_000).toISOString();
    authFetch.mockImplementation(async () => new Response(JSON.stringify({ url: `/api/v2/attachments/${ID}/content?pt=t1`, expires_at: expires })));
    const [first, second] = await Promise.all([playbackUrl(ID), playbackUrl(ID)]);
    expect(first).toBe(second);
    expect(first).toContain('pt=t1');
    expect(await playbackUrl(ID)).toBe(first);
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(String(authFetch.mock.calls[0][0])).toMatch(new RegExp(`/attachments/${ID}/playback$`));
    forgetPlaybackUrl(ID);
    await playbackUrl(ID, 'animation');
    expect(String(authFetch.mock.calls[1][0])).toMatch(/\/playback\?variant=animation$/);
  });

  it('fails when the server refuses', async () => {
    const { playbackUrl } = await import('./playbackUrl');
    authFetch.mockImplementation(async () => new Response('{}', { status: 404 }));
    await expect(playbackUrl(ID)).rejects.toThrow('playback 404');
  });
});

describe('warming playback URLs', () => {
  const observers: Array<{ callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
  const lease = () => new Response(JSON.stringify({ url: `/api/v2/attachments/${ID}/content?pt=warm`, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }));

  afterEach(() => {
    authFetch.mockReset();
    observers.length = 0;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('gets the URL ahead of time so the click reuses it, and ignores refusals', async () => {
    const { playbackUrl, warmPlaybackUrl } = await import('./playbackUrl');
    authFetch.mockImplementation(async () => lease());
    warmPlaybackUrl(`/api/v2/attachments/${ID}/content`);
    warmPlaybackUrl('/static/a.mp3');
    expect(await playbackUrl(ID)).toContain('pt=warm');
    expect(authFetch).toHaveBeenCalledTimes(1);
    authFetch.mockImplementation(async () => new Response('{}', { status: 404 }));
    const { forgetPlaybackUrl } = await import('./playbackUrl');
    forgetPlaybackUrl(ID);
    expect(() => warmPlaybackUrl(`/api/v2/attachments/${ID}/content`)).not.toThrow();
  });

  it('warms once when the song scrolls into view and stops watching', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(callback: IntersectionObserverCallback) { observers.push({ callback, disconnect: this.disconnect }); }
      observe() { return undefined; }
    });
    const { renderHook, act } = await import('@testing-library/react');
    const { useWarmPlaybackUrl } = await import('./playbackUrl');
    authFetch.mockImplementation(async () => lease());
    const { result } = renderHook(() => useWarmPlaybackUrl(`/api/v2/attachments/${ID}/content`, true));
    act(() => result.current(document.createElement('div')));
    expect(authFetch).not.toHaveBeenCalled();
    act(() => observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('does nothing for voice messages', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useWarmPlaybackUrl } = await import('./playbackUrl');
    const { result } = renderHook(() => useWarmPlaybackUrl(`/api/v2/attachments/${ID}/content`, false));
    act(() => result.current(document.createElement('div')));
    expect(observers).toHaveLength(0);
    expect(authFetch).not.toHaveBeenCalled();
  });
});

describe('streaming from a playback URL', () => {
  const source = `/api/v2/attachments/${ID}/content`;

  afterEach(() => {
    authFetch.mockReset();
    keepOfflineCopy.mockReset();
    vi.resetModules();
  });

  it('streams the playback URL and keeps an offline copy of the source', async () => {
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { usePlaybackUrl } = await import('./playbackUrl');
    authFetch.mockImplementation(async () => new Response(JSON.stringify({ url: `/api/v2/attachments/${ID}/content?pt=play`, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() })));
    const { result } = renderHook(() => usePlaybackUrl(source));
    await waitFor(() => expect(result.current.src).toContain('pt=play'));
    expect(result.current.streaming).toBe(true);
    expect(keepOfflineCopy).toHaveBeenCalledWith(source);
  });

  it('falls back to the normal download when the server refuses the playback URL', async () => {
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { usePlaybackUrl } = await import('./playbackUrl');
    authFetch.mockImplementation(async () => new Response('{}', { status: 403 }));
    const { result } = renderHook(() => usePlaybackUrl(source));
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.src).toBeUndefined();
    expect(keepOfflineCopy).not.toHaveBeenCalled();
  });
});
