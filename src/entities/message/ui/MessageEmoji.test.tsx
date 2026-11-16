import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageTextBody } from './MessageTextBody';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));

describe('custom emoji in message text', () => {
  it('draws tokens next to links and text', () => {
    render(<MessageTextBody text="see https://example.com <:party:12> now" />);
    expect(screen.getByRole('img', { name: ':party:' })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveTextContent('https://example.com');
  });

  it('shows emoji-only messages large', () => {
    const { container } = render(<MessageTextBody text="<:party:12><a:wave:13>" />);
    expect(container.querySelector('[data-emoji-only]')).not.toBeNull();
    const { container: mixed } = render(<MessageTextBody text="hi <:party:12>" />);
    expect(mixed.querySelector('[data-emoji-only]')).toBeNull();
  });
});
