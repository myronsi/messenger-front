import { describe, expect, it } from 'vitest';
import { HELP_SITE_PRODUCTION, HELP_SITE_STAGING, helpSiteBase, helpSiteUrl } from './helpSite';

describe('helpSiteBase', () => {
  it.each([
    ['https://staging.messenger.viserix.com/api/v2', 'https://localhost', HELP_SITE_STAGING],
    ['/api/v2', 'https://staging.messenger.viserix.com', HELP_SITE_STAGING],
    ['https://messenger.viserix.com/api/v2', 'https://localhost', HELP_SITE_PRODUCTION],
    ['/api/v2', 'https://messenger.viserix.com', HELP_SITE_PRODUCTION],
    ['http://localhost:8080/api/v2', 'http://localhost:5173', HELP_SITE_PRODUCTION],
    ['https://notstaging.example.com/api', 'https://localhost', HELP_SITE_PRODUCTION],
  ])('picks the help site for API %s on %s', (api, origin, expected) => {
    expect(helpSiteBase(api, origin)).toBe(expected);
  });
});

describe('helpSiteUrl', () => {
  it('opens help at the root without a language', () => {
    expect(helpSiteUrl(undefined, 'de', HELP_SITE_PRODUCTION)).toBe('https://docs.messenger.viserix.com/');
  });

  it.each(['en', 'de', 'ru', 'es'])('opens a legal page in %s', (language) => {
    expect(helpSiteUrl('privacy', language, HELP_SITE_STAGING)).toBe(`https://docs.staging.messenger.viserix.com/#/privacy/${language}`);
  });

  it('falls back to English for an unknown language', () => {
    expect(helpSiteUrl('terms', 'fr', HELP_SITE_PRODUCTION)).toBe('https://docs.messenger.viserix.com/#/terms/en');
  });
});
