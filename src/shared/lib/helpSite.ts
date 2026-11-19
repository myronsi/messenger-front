import { getApiBaseUrl } from '@/shared/api/config';
import { isAppLanguage, type AppLanguage } from '@/shared/lang/languages';

export const TERMS_VERSION = '2026-11-19';

export const LEGAL_PAGES = ['privacy', 'terms', 'guidelines', 'imprint'] as const;
export type LegalPage = typeof LEGAL_PAGES[number];

export const HELP_SITE_PRODUCTION = 'https://docs.messenger.viserix.com/';
export const HELP_SITE_STAGING = 'https://docs.staging.messenger.viserix.com/';

const hostOf = (url: string, origin: string) => {
  try {
    return new URL(url, origin).hostname;
  } catch {
    return '';
  }
};

export const helpSiteBase = (apiBaseUrl = getApiBaseUrl(), origin = window.location.origin) =>
  /(^|\.)staging\./.test(hostOf(apiBaseUrl, origin)) ? HELP_SITE_STAGING : HELP_SITE_PRODUCTION;

export const helpSiteUrl = (page?: LegalPage, language?: string, base = helpSiteBase()) => {
  if (!page) return base;
  const lang: AppLanguage = isAppLanguage(language) ? language : 'en';
  return `${base}#/${page}/${lang}`;
};

export const leaveFor = (url: string) => window.location.replace(url);
