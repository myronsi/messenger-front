import { render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { de } from '@/shared/lang/de';
import { en } from '@/shared/lang/en';
import { LegalFooter } from './LegalFooter';

const state = vi.hoisted(() => ({ language: 'en' }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const bundles = { en: (await import('@/shared/lang/en')).en, de: (await import('@/shared/lang/de')).de };
  return { useLanguage: () => ({ language: state.language, translations: bundles[state.language as 'en' | 'de'] }) };
});

beforeEach(() => { state.language = 'en'; });

it('links help and every legal page on the help site in a new tab', () => {
  render(<LegalFooter />);
  const nav = screen.getByRole('navigation', { name: en.legal.footerLabel });
  const links = within(nav).getAllByRole('link');
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Help', 'https://docs.messenger.viserix.com/'],
    ['Privacy Policy', 'https://docs.messenger.viserix.com/#/privacy/en'],
    ['Terms of Use', 'https://docs.messenger.viserix.com/#/terms/en'],
    ['Community Guidelines', 'https://docs.messenger.viserix.com/#/guidelines/en'],
    ['Imprint', 'https://docs.messenger.viserix.com/#/imprint/en'],
  ]);
  for (const link of links) {
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

it('opens the legal pages in the current language', () => {
  state.language = 'de';
  render(<LegalFooter />);
  expect(screen.getByRole('link', { name: de.legal.documents.privacy })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/privacy/de');
  expect(screen.getByRole('link', { name: 'Impressum' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/imprint/de');
  expect(screen.getByRole('link', { name: 'Hilfe' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/');
});
