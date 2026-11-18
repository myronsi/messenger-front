import { afterEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/shared/auth/session', () => ({ authFetch: (...args: unknown[]) => authFetch(...args) }));

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
