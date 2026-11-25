import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ authFetch: vi.fn(), token: 'token' as string | null }));

vi.mock('@/shared/auth/session', () => ({
  authFetch: session.authFetch,
  getAccessToken: () => session.token,
  subscribeToAccessToken: () => () => undefined,
  useAccessToken: () => session.token,
}));

import { clearMediaCache } from '@/shared/api/mediaCache';
import { EMPTY_IMAGE, rememberAvatarBlur } from '@/shared/lib/avatarBlur';
import { AuthenticatedImage } from './AuthenticatedImage';

const avatar = `${window.location.origin}/api/v2/users/7/avatar?rev=a1`;

beforeEach(() => {
  vi.stubEnv('VITE_BASE_URL', window.location.origin + '/api');
  let count = 0;
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:avatar-${++count}`), revokeObjectURL: vi.fn() });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() { this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() { return undefined; }
  });
});

afterEach(() => {
  clearMediaCache();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('AuthenticatedImage', () => {
  it('shows a neutral placeholder instead of a name or broken-image icon while the avatar loads', async () => {
    let finish: (response: Response) => void = () => undefined;
    session.authFetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));

    render(<AuthenticatedImage src={avatar} alt="Mai" className="rounded-full" />);
    const image = screen.getByRole('presentation');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('src')).toBe(EMPTY_IMAGE);
    expect(image.dataset.placeholder).toBe('empty');

    await waitFor(() => expect(session.authFetch).toHaveBeenCalled());
    finish(new Response('png', { status: 200 }));
    await waitFor(() => expect(screen.getByAltText('Mai').getAttribute('src')).toBe('blob:avatar-1'));
  });

  it('shows an avatar that is already loaded on the first render, without a blank frame', async () => {
    session.authFetch.mockImplementation(async () => new Response('png', { status: 200 }));
    const first = render(<AuthenticatedImage src={avatar} alt="Mai" />);
    await waitFor(() => expect(screen.getByAltText('Mai').getAttribute('src')).toBe('blob:avatar-1'));
    first.unmount();

    render(<AuthenticatedImage src={avatar} alt="Mai" />);

    expect(screen.getByAltText('Mai').getAttribute('src')).toBe('blob:avatar-1');
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });
  it('shows a letter avatar for the default picture even though it loads as a protected blob', async () => {
    session.authFetch.mockImplementation(async () => new Response('png', { status: 200 }));
    render(<AuthenticatedImage src={`${window.location.origin}/api/v2/static/avatars/default.jpg`} alt="Anna" />);
    await waitFor(() => expect(screen.getByAltText('Anna').getAttribute('src')).toMatch(/^data:image\/svg\+xml/));
  });

  it('loads the picture again once when its cached copy stops working, before calling it broken', async () => {
    const sticker = `${window.location.origin}/api/v2/attachments/s1/content`;
    session.authFetch.mockImplementation(async () => new Response('webp', { status: 200 }));
    const onError = vi.fn();
    render(<AuthenticatedImage src={sticker} alt="👍" onError={onError} />);
    await waitFor(() => expect(screen.getByAltText('👍').getAttribute('src')).toBe('blob:avatar-1'));

    fireEvent.error(screen.getByAltText('👍'));

    await waitFor(() => expect(screen.getByAltText('👍').getAttribute('src')).toBe('blob:avatar-2'));
    expect(session.authFetch).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
    fireEvent.error(screen.getByAltText('👍'));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('shows the remembered blurred copy while an avatar it has seen before loads again', async () => {
    const blurred = 'data:image/jpeg;base64,blurred';
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(blurred);
    const seen = `${window.location.origin}/api/v2/users/8/avatar?rev=b2`;
    const loaded = document.createElement('img');
    Object.defineProperty(loaded, 'naturalWidth', { value: 64 });
    Object.defineProperty(loaded, 'naturalHeight', { value: 64 });
    rememberAvatarBlur(seen, loaded);
    session.authFetch.mockImplementation(() => new Promise(() => undefined));

    render(<AuthenticatedImage src={seen} alt="Ira" />);

    const image = screen.getByRole('presentation');
    expect(image.getAttribute('src')).toBe(blurred);
    expect(image.dataset.placeholder).toBe('blur');
  });

  it('keeps message images without an avatar placeholder', () => {
    session.authFetch.mockImplementation(() => new Promise(() => undefined));
    render(<AuthenticatedImage src={`${window.location.origin}/api/v2/attachments/p1/content`} alt="photo" />);
    expect(screen.getByRole('presentation').hasAttribute('src')).toBe(false);
  });
});
