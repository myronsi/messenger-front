import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AboutPage from './AboutPage';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { es: translations } = await import('@/shared/lang/es');
  return { useLanguage: () => ({ translations, language: 'es' }) };
});
vi.mock('@/shared/api/versionApi', () => ({ useGetServerVersionQuery: () => ({ data: undefined, isLoading: false }) }));

it('links help and the legal pages in the user language', () => {
  render(<AboutPage onBack={vi.fn()} />);
  expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/');
  const legal = screen.getByRole('region', { name: 'Información legal' });
  const links = within(legal).getAllByRole('link');
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Política de privacidad', 'https://docs.messenger.viserix.com/#/privacy/es'],
    ['Condiciones de uso', 'https://docs.messenger.viserix.com/#/terms/es'],
    ['Normas de la comunidad', 'https://docs.messenger.viserix.com/#/guidelines/es'],
    ['Aviso legal', 'https://docs.messenger.viserix.com/#/imprint/es'],
  ]);
  for (const link of [...links, screen.getByRole('link', { name: 'Ayuda' })]) {
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});
