import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ authFetch: vi.fn(), token: 'token' as string | null }));

vi.mock('@/shared/auth/session', () => ({
  authFetch: session.authFetch,
  subscribeToAccessToken: () => () => undefined,
  useAccessToken: () => session.token,
}));

import { clearMediaCache } from '@/shared/api/mediaCache';
import { AuthenticatedImage } from './AuthenticatedImage';

const avatar = `${window.location.origin}/api/v2/users/7/avatar?rev=a1`;

beforeEach(() => {
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
  vi.unstubAllGlobals();
});

describe('AuthenticatedImage', () => {
  it('shows no name or broken-image icon while the avatar loads', async () => {
    let finish: (response: Response) => void = () => undefined;
    session.authFetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));

    render(<AuthenticatedImage src={avatar} alt="Mai" className="rounded-full" />);
    const image = screen.getByRole('presentation');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.hasAttribute('src')).toBe(false);

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
});
