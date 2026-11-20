import { describe, expect, it } from 'vitest';
import { appLinkFrom } from './appLink';

const origin = 'https://messenger.example';
const configured = 'https://staging.messenger.example';

describe('appLinkFrom', () => {
  it('recognises emoji packs, sticker packs and profiles on our own sites', () => {
    expect(appLinkFrom(`${origin}/emoji/EBKDJY57GBYH`, origin, configured)).toEqual({ kind: 'emoji', slug: 'EBKDJY57GBYH' });
    expect(appLinkFrom(`${configured}/stickers/K3P9QX12`, origin, configured)).toEqual({ kind: 'sticker', slug: 'K3P9QX12' });
    expect(appLinkFrom(`${origin}/dm/@mailen`, origin, configured)).toEqual({ kind: 'profile', username: 'mailen' });
  });

  it('ignores other sites and other paths', () => {
    expect(appLinkFrom('https://evil.example/emoji/EBKDJY57GBYH', origin, configured)).toBeNull();
    expect(appLinkFrom(`${origin}/settings`, origin, configured)).toBeNull();
    expect(appLinkFrom(`${origin}/dm/42`, origin, configured)).toBeNull();
    expect(appLinkFrom('https://evil.example/@anna', origin, configured)).toBeNull();
    expect(appLinkFrom(`${origin}/@an`, origin, configured)).toBeNull();
    expect(appLinkFrom(`${origin}/join/short`, origin, configured)).toBeNull();
  });

  it('recognises public names and invite links', () => {
    const token = 'Ab12'.repeat(5) + 'xy';
    expect(appLinkFrom(`${origin}/@anna_k`, origin, configured)).toEqual({ kind: 'name', name: 'anna_k' });
    expect(appLinkFrom(`${configured}/@Team_Chat/`, origin, configured)).toEqual({ kind: 'name', name: 'Team_Chat' });
    expect(appLinkFrom(`${origin}/join/${token}`, origin, configured)).toEqual({ kind: 'invite', token });
  });
});
