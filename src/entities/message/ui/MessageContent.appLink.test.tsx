import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import MessageContent from './MessageContent';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('./AppLinkCard', () => ({
  AppLinkCard: ({ link, standalone, fallback }: { link: { kind: string }; standalone?: boolean; fallback?: ReactNode }) => (
    <div data-testid="app-link-card" data-kind={link.kind} data-standalone={String(!!standalone)}>{fallback && <span data-testid="fallback">{fallback}</span>}</div>
  ),
}));
vi.mock('./LinkPreviewCard', () => ({ default: () => <div data-testid="site-preview" /> }));

const packLink = `${window.location.origin}/emoji/EBKDJY57GBYH`;
const textMessage = (content: string): Message => ({ id: '7', sender: 'ann', sender_id: '2', timestamp: '2026-11-20T10:00:00Z', type: 'message', read_by: [], content });
const renderText = (content: string) => render(
  <MessageContent message={textMessage(content)} isMobile={false} translations={en} getFileTypeConfig={() => undefined} isOwnMessage={() => false}
    renderMessageContent={(message) => message.content as string} onPlayAudio={vi.fn()} />,
);

describe('MessageContent with our own links', () => {
  it('turns a message that is only our link into the card and keeps the link as fallback while it loads', () => {
    renderText(`  ${packLink}  `);
    const card = screen.getByTestId('app-link-card');
    expect(card).toHaveAttribute('data-kind', 'emoji');
    expect(card).toHaveAttribute('data-standalone', 'true');
    expect(screen.getByTestId('fallback')).toHaveTextContent('EBKDJY57GBYH');
    expect(screen.queryByTestId('site-preview')).not.toBeInTheDocument();
  });

  it('keeps the text and adds the card under it when there is more than the link', () => {
    renderText(`look at this ${packLink}`);
    expect(screen.getByText(/look at this/)).toBeInTheDocument();
    expect(screen.getByTestId('app-link-card')).toHaveAttribute('data-standalone', 'false');
  });

  it('keeps the normal preview for other websites', () => {
    renderText('https://example.com/post');
    expect(screen.getByTestId('site-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('app-link-card')).not.toBeInTheDocument();
  });
});
